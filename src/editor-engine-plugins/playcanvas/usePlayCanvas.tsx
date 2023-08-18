import { useCallback, useEffect, useRef, useState, useContext } from 'react';
import * as pc from 'playcanvas';
import { useHoisty } from '../../editor/hoistedRefContext';

type SceneData = {
  lights: pc.Entity[];
  mesh?: pc.Entity;
};
type ScenePersistence = {
  sceneData: SceneData;
  canvas: HTMLCanvasElement;
  pcDom: HTMLDivElement;
  app: pc.Application;
  camera: pc.Entity;
  loadingMaterial: pc.Material;
};

type Callback = (time: number) => void;

export const usePlayCanvas = (callback: Callback) => {
  const { getRefData } = useHoisty();

  const { canvas, loadingMaterial, app, camera, sceneData } = getRefData<
    Omit<ScenePersistence, 'pcDom'>
  >('babylon', () => {
    const canvas = document.createElement('canvas');

    const app = new pc.Application(canvas);
    // fill the available space at full resolution
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

    app.start();

    const camera = new pc.Entity('camera');
    camera.addComponent('camera', {
      clearColor: new pc.Color(0.1, 0.1, 0.1),
    });
    app.root.addChild(camera);
    camera.setPosition(0, 0, 3);

    const loadingMaterial = new pc.StandardMaterial();
    loadingMaterial.diffuse.set(0.8, 0.2, 0.5);

    return {
      sceneData: {
        lights: [],
      },
      canvas,
      app,
      loadingMaterial,
      camera,
      destroy: (data: ScenePersistence) => {
        console.log('👋🏻 Bye Bye PlayCanvas!');
        app.destroy();
      },
    };
  });

  const [pcDom, setPcDom] = useState<HTMLDivElement | null>(null);
  const pcDomRef = useCallback((node) => setPcDom(node), []);

  // useEffect(() => {
  //   // Target the camera to scene origin
  //   camera.setTarget(BABYLON.Vector3.Zero());
  //   // Attach the camera to the canvas
  //   camera.attachControl(canvas, false);
  // }, [camera, canvas]);

  useEffect(() => {
    if (pcDom && !pcDom.childNodes.length) {
      console.log('Re-attaching PC DOM', canvas, 'to', pcDom);
      pcDom.appendChild(canvas);
    }
  }, [canvas, pcDom]);

  const savedCallback = useRef<Callback>(callback);
  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (pcDom && !pcDom.childNodes.length) {
      console.log('Re-attaching Playcanvas DOM', canvas, 'to', pcDom);
      pcDom.appendChild(canvas);
    }
  }, [canvas, pcDom]);

  const animate = useCallback(
    (time: number) => {
      app.render();
      savedCallback.current(time);
    },
    [app]
  );

  useEffect(() => {
    if (pcDom) {
      console.log('🎬 Starting PC requestAnimationFrame');

      app.on('update', animate);
    }

    return () => {
      console.log('🛑 Cleaning up PC animationframe');
      app.off('update');
    };
  }, [app, animate, pcDom]);

  return {
    canvas,
    pcDom,
    pcDomRef,
    app,
    camera,
    sceneData,
    loadingMaterial,
  };
};
