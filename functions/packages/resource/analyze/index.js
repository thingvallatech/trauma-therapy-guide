const Anthropic = require('@anthropic-ai/sdk');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const s3 = new S3Client({
  endpoint: process.env.SPACES_ENDPOINT,
  region: process.env.SPACES_REGION || 'nyc3',
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY,
  },
});

function parseMultipart(args) {
  // DO Functions web actions receive multipart form data as base64-encoded __ow_body
  if (!args.__ow_body) return args;

  const contentType = (args.__ow_headers || {})['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) return args;

  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return args;

  const body = Buffer.from(args.__ow_body, 'base64').toString('binary');
  const parts = body.split('--' + boundary).slice(1, -1);
  const parsed = {};

  for (const part of parts) {
    const [headerSection, ...valueParts] = part.split('\r\n\r\n');
    const value = valueParts.join('\r\n\r\n').replace(/\r\n$/, '');
    const nameMatch = headerSection.match(/name="([^"]+)"/);
    if (!nameMatch) continue;

    const name = nameMatch[1];
    const filenameMatch = headerSection.match(/filename="([^"]+)"/);
    const ctMatch = headerSection.match(/Content-Type:\s*(.+)/i);

    if (filenameMatch) {
      // File field — store as base64
      parsed.file = Buffer.from(value, 'binary').toString('base64');
      parsed.fileName = filenameMatch[1];
      parsed.fileContentType = ctMatch ? ctMatch[1].trim() : 'application/octet-stream';
    } else {
      parsed[name] = value;
    }
  }

  return parsed;
}

function checkAuth(args) {
  const expected = process.env.ADMIN_TOKEN;
  const provided = (args.__ow_headers || {})['x-admin-token'];
  // Fail closed: reject unless ADMIN_TOKEN is configured AND matches
  return Boolean(expected) && provided === expected;
}

async function main(args) {
  try {
    if (!checkAuth(args)) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized.' }) };
    }

    const params = parseMultipart(args);
    const { url, file, fileName, fileContentType } = params;

    let contentForAI = '';
    let fileUrl = '';

    if (file) {
      // File was uploaded — decode base64, upload to Spaces, extract text
      const buffer = Buffer.from(file, 'base64');
      const key = `resources/${Date.now()}-${fileName}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.SPACES_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: fileContentType || 'application/pdf',
          ACL: 'public-read',
        })
      );

      fileUrl = `${process.env.SPACES_CDN_URL}/${key}`;
      contentForAI = `Uploaded file: ${fileName} (${fileContentType}). File URL: ${fileUrl}`;
    } else if (url) {
      // Fetch the URL and extract content
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResourceBot/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();
      // Strip HTML tags for cleaner AI input
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      contentForAI = text.substring(0, 8000);
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Provide a URL or file.' }),
      };
    }

    const existingTags = params.existingTags || [];

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analyze this resource and generate metadata for a trauma therapy resource library.

${url ? `URL: ${url}` : ''}
${fileUrl ? `File URL: ${fileUrl}` : ''}

Content:
${contentForAI}

${existingTags.length > 0 ? `Existing tags in the library (prefer these when they fit): ${existingTags.join(', ')}` : ''}

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "title": "Clear, descriptive title",
  "author": "Author name if identifiable, empty string if not",
  "description": "2-3 sentence description of this resource and its value for trauma therapists or families",
  "type": "book|pdf|article|video|worksheet|link",
  "audience": "clinician|family|both",
  "tags": ["tag1", "tag2", "tag3"]
}`,
        },
      ],
    });

    const responseText = message.content[0].text.trim();
    const metadata = JSON.parse(responseText);

    return {
      body: {
        ...metadata,
        url: url || '',
        fileUrl: fileUrl || '',
      },
    };
  } catch (error) {
    console.error('Analyze error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

exports.main = main;
