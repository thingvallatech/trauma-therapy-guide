const { Octokit } = require('octokit');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

async function main(args) {
  try {
    const { title, author, description, type, audience, tags, url, fileUrl } = args;

    if (!title) {
      return { statusCode: 400, body: { error: 'Title is required.' } };
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const [owner, repo] = (process.env.GITHUB_REPO || '').split('/');

    const slug = slugify(title);
    const dateAdded = new Date().toISOString().split('T')[0];

    const frontmatter = [
      '---',
      `title: "${title.replace(/"/g, '\\"')}"`,
      `type: ${type || 'link'}`,
      `audience: ${audience || 'both'}`,
      `tags: [${(tags || []).map((t) => `"${t}"`).join(', ')}]`,
      `url: "${url || ''}"`,
      `fileUrl: "${fileUrl || ''}"`,
      `author: "${(author || '').replace(/"/g, '\\"')}"`,
      `dateAdded: ${dateAdded}`,
      '---',
      '',
      description || '',
      '',
    ].join('\n');

    const path = `src/content/resources/${slug}.md`;
    const content = Buffer.from(frontmatter).toString('base64');

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `feat: add resource "${title}"`,
      content,
      branch: 'main',
    });

    return {
      statusCode: 200,
      body: { success: true, path, slug },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: { error: error.message },
    };
  }
}

exports.main = main;
