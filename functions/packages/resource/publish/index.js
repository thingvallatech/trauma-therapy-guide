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
      return { statusCode: 400, body: JSON.stringify({ error: 'Title is required.' }) };
    }

    const [owner, repo] = (process.env.GITHUB_REPO || '').split('/');
    const token = process.env.GITHUB_TOKEN;

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

    // Use GitHub REST API directly instead of octokit (ESM-only)
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'trauma-therapy-resource-bot',
      },
      body: JSON.stringify({
        message: `feat: add resource "${title}"`,
        content,
        branch: 'main',
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`GitHub API ${res.status}: ${errorBody}`);
    }

    return {
      body: { success: true, path, slug },
    };
  } catch (error) {
    console.error('Publish error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

exports.main = main;
