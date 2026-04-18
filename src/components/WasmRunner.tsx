import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  wasmUrl: string;
  width?: number;
  height?: number;
}

export default function WasmRunner({ wasmUrl, width = 600, height = 400 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(wasmUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${wasmUrl}: ${response.status}`);
        const buffer = await response.arrayBuffer();
        const module = await WebAssembly.compile(buffer);

        const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
        const importObject: WebAssembly.Imports = {
          env: {
            memory,
            print: (val: number) => console.log('[wasm]', val),
            time: () => Date.now(),
            random: () => Math.random(),
          },
        };

        const instance = await WebAssembly.instantiate(module, importObject);
        if (cancelled) return;

        const exports = instance.exports as Record<string, WebAssembly.ExportValue>;

        // Use WASM's own exported memory if available, otherwise fall back to JS-created one
        const mem = exports.memory instanceof WebAssembly.Memory
          ? exports.memory as WebAssembly.Memory : memory;

        console.log('[WasmRunner] exports:', Object.keys(exports));
        console.log('[WasmRunner] using memory:', exports.memory ? 'wasm-exported' : 'js-created');
        console.log('[WasmRunner] memory buffer size:', mem.buffer.byteLength);

        setStatus('loaded');

        if (typeof exports._start === 'function') {
          (exports._start as Function)();
        }
        if (typeof exports.main === 'function') {
          (exports.main as Function)();
        }

        if (typeof exports.update === 'function' && typeof exports.render === 'function') {
          const canvas = canvasRef.current!;
          const ctx = canvas.getContext('2d')!;

          const wasmWidth = typeof exports.width === 'function'
            ? (exports.width as Function)() : width;
          const wasmHeight = typeof exports.height === 'function'
            ? (exports.height as Function)() : height;

          canvas.width = wasmWidth;
          canvas.height = wasmHeight;
          const bufLen = wasmWidth * wasmHeight * 4;

          console.log('[WasmRunner] canvas:', wasmWidth, 'x', wasmHeight, 'bufLen:', bufLen);

          const imageData = ctx.createImageData(wasmWidth, wasmHeight);

          let frame = 0;
          function loop() {
            if (cancelled) return;
            try {
              (exports.update as Function)(frame);
              (exports.render as Function)(frame);
              // Re-read buffer each frame in case it was detached by memory.grow
              const pixels = new Uint8ClampedArray(mem.buffer, 0, bufLen);
              imageData.data.set(pixels);
              ctx.putImageData(imageData, 0, 0);
            } catch (e) {
              if (frame === 0) console.error('[WasmRunner] render error:', e);
            }
            frame++;
            requestAnimationFrame(loop);
          }
          loop();
        } else {
          console.log('[WasmRunner] no update/render exports found');
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatus('error');
          setError(err.message);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [wasmUrl]);

  return (
    <div class="wasm-runner">
      <div class="wasm-bar">
        <span class="wasm-badge">WASM</span>
        <span class="wasm-url">{wasmUrl.split('/').pop()}</span>
        <span class={`wasm-status ${status}`}>
          {status === 'loading' ? '...' : status === 'loaded' ? 'ok' : 'err'}
        </span>
      </div>
      {status === 'error' && (
        <pre class="wasm-error">{error}</pre>
      )}
      <canvas ref={canvasRef} width={width} height={height} class="wasm-canvas" />
    </div>
  );
}
