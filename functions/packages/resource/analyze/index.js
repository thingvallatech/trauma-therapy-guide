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

async function main(args) {
  try {
    const { url, file, fileName, fileContentType } = args;

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
      const res = await fetch(url);
      const html = await res.text();
      contentForAI = html.substring(0, 10000);
    } else {
      return { statusCode: 400, body: { error: 'Provide a URL or file.' } };
    }

    const existingTags = args.existingTags || [];

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

    const text = message.content[0].text.trim();
    const metadata = JSON.parse(text);

    return {
      statusCode: 200,
      body: {
        ...metadata,
        url: url || '',
        fileUrl: fileUrl,
      },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: { error: error.message },
    };
  }
}

exports.main = main;
