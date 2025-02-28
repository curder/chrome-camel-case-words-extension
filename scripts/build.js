const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

const browser = process.argv[2];
if (!browser || !['chrome', 'firefox'].includes(browser)) {
  console.error('Please specify browser: chrome or firefox');
  process.exit(1);
}

async function zipDirectory(source, out) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = fs.createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on('error', err => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });
}

async function build() {
  try {
    // 读取 package.json 获取版本号
    const packageJson = await fs.readJson(path.join(__dirname, '..', 'package.json'));
    const version = packageJson.version;

    // 使用绝对路径
    const rootDir = path.join(__dirname, '..', 'src');
    const distDir = path.join(rootDir, '..', 'dist', browser);

    // 确保 dist 目录存在
    await fs.ensureDir(distDir);

    // 读取基础 manifest 文件
    const baseManifest = await fs.readJson(path.join(rootDir, 'manifest.json'));

    // 读取浏览器特定的 manifest 文件
    const browserManifestPath = path.join(rootDir, `manifest.${browser}.json`);
    const browserManifest = await fs.readJson(browserManifestPath);

    // 合并 manifest 文件并更新版本号
    const finalManifest = {
      ...baseManifest,
      ...browserManifest,
      version: version // 确保 manifest 使用相同的版本号
    };

    // 写入合并后的 manifest
    const outputPath = path.join(distDir, 'manifest.json');
    await fs.writeJson(outputPath, finalManifest, { spaces: 2 });

    console.log(`✅ Successfully built for ${browser}`);
    console.log(`   Manifest written to: ${outputPath}`);

    // 为特定浏览器创建带版本号的 zip 文件
    const zipPath = path.join(rootDir, '..', 'dist', `${browser}-v${version}.zip`);
    await zipDirectory(distDir, zipPath);
    console.log(`✅ Created ${browser}-v${version}.zip`);

  } catch (err) {
    console.error(`❌ Build failed for ${browser}:`, err);
    console.error('Error details:', err.message);
    process.exit(1);
  }
}

build(); 