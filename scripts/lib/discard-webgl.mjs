/** Release a discarded page's GPU context while its game loop may still be running. Context loss must finish
    before dispose: Three's loss handler disables rendering; disposing live programs first can race the next RAF. */
export async function discardWebGL(page) {
  await page.evaluate(async () => {
    const renderer = window.__tideRenderer;
    const gl = renderer?.getContext() ?? document.querySelector('canvas')?.getContext('webgl2');
    if (!gl) throw new Error('No WebGL context to discard');
    if (!gl.isContextLost()) {
      const extension = gl.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Explicit WebGL context loss is unavailable');
      await new Promise((resolve, reject) => {
        const lost = () => { clearTimeout(timer); resolve(); };
        const timer = setTimeout(() => {
          gl.canvas.removeEventListener('webglcontextlost', lost); reject(new Error('WebGL context loss timed out'));
        }, 2000);
        gl.canvas.addEventListener('webglcontextlost', lost, { once: true });
        extension.loseContext();
      });
    }
    renderer?.dispose();
  });
}
