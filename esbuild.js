// esbuild.config.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// 确保输出目录存在
function ensureOutDir() {
  const outDir = path.join(__dirname, 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`创建输出目录: ${outDir}`);
  }
  return outDir;
}

// 主构建函数
async function build() {
  try {
    // 确保输出目录存在
    const outDir = ensureOutDir();
    const outFile = path.join(outDir, 'extension.js');
    const buildOptions = {
      entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
      bundle: true,
      minify: true,
      platform: 'node',
      outfile: outFile,
      external: ['vscode'],
      format: 'cjs',
      target: 'node18',
      sourcemap: true,
      logLevel: 'info',
      color: true,
      metafile: true,
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      plugins: [
        // 添加自定义插件（如果需要）
        {
          name: 'on-end-plugin',
          setup(build) {
            build.onEnd(result => {
              if (result.errors.length > 0) {
                console.error('构建失败，请检查错误');
              } else {
                console.log(`构建成功！输出文件: ${outFile}`);
                console.log(`文件大小: ${(fs.statSync(outFile).size / 1024).toFixed(2)} KB`);
              }
            });
          }
        }
      ]
    };
    
    // 执行构建
    const result = await esbuild.build(buildOptions);
    
    // 生成构建报告
    if (buildOptions.metafile) {
      const metaFile = path.join(outDir, 'meta.json');
      fs.writeFileSync(metaFile, JSON.stringify(result.metafile, null, 2));
      console.log(`构建元数据已保存: ${metaFile}`);
    }
    
    return result;
  } catch (error) {
    console.error('构建过程中发生错误:', error);
    process.exit(1);
  }
}

// 根据命令行参数决定模式
if (process.argv.includes('--watch')) {
  // 监听模式
  esbuild.context({
    // 复用构建选项
    ...buildOptions,
    logLevel: 'debug'
  }).then(async (context) => {
    console.log('进入监听模式...');
    await context.watch();
  }).catch(error => {
    console.error('监听模式启动失败:', error);
    process.exit(1);
  });
} else {
  // 执行构建
  build();
}