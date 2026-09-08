// Render the existing licensed models into palette previews. Requires npm run dev.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.THUMBNAIL_BASE_URL || 'http://127.0.0.1:4321/tools');
  const figures = await page.evaluate(async () => (await import('/src/data/sandtrayFigures.ts')).sandtrayFigures);
  await mkdir('public/sandtray/thumbnails', { recursive: true });
  for (const figure of figures) {
    const data = await page.evaluate(async (figure) => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(160,160); renderer.setClearColor('#fdfaf5'); renderer.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x696054, 3));
      const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(3,5,4); scene.add(light);
      const gltf = await new GLTFLoader().loadAsync(figure.modelPath);
      const model = gltf.scene; scene.add(model);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const span = Math.max(size.x, size.y, size.z) * 1.55;
      const camera = new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,.01,1000);
      camera.position.copy(center).add(new THREE.Vector3(span,span*.65,span*1.5)); camera.lookAt(center);
      renderer.render(scene,camera);
      const data = renderer.domElement.toDataURL('image/png').split(',')[1];
      renderer.dispose(); renderer.forceContextLoss();
      model.traverse(node => { node.geometry?.dispose(); const mats=Array.isArray(node.material)?node.material:[node.material]; for (const mat of mats) mat?.dispose(); });
      return data;
    }, figure);
    await writeFile(`public/sandtray/thumbnails/${figure.id}.png`, Buffer.from(data,'base64'));
  }
  console.log(`Rendered ${figures.length} model previews.`);
} finally { await browser.close(); }
