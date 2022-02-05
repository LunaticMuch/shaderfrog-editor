import styles from '../pages/editor/editor.module.css';

import { UICompileGraphResult } from './Editor';

import React, {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as three from 'three';
import {
  outputNode,
  Graph,
  shaderSectionsToAst,
  Node,
  addNode,
  multiplyNode,
  ShaderType,
  Edge,
  ShaderStage,
} from './nodestuff';
import {
  compileGraph,
  computeAllContexts,
  computeGraphContext,
  EngineContext,
  NodeInputs,
} from './graph';

import { threngine, RuntimeContext } from './threngine';

import { useThree } from './useThree';

const loadingMaterial = new three.MeshBasicMaterial({ color: 'pink' });

type AnyFn = (...args: any) => any;
type ThreeSceneProps = {
  compile: AnyFn;
  compiling: boolean;
  compileResult: UICompileGraphResult | undefined;
  graph: Graph;
  lights: string;
  previewObject: string;
  setCtx: <T extends unknown>(ctx: EngineContext<T>) => void;
  setGlResult: AnyFn;
  setLights: AnyFn;
  setPreviewObject: AnyFn;
  width: number;
  height: number;
};
const ThreeComponent: React.FC<ThreeSceneProps> = ({
  compile,
  compiling,
  compileResult,
  graph,
  lights,
  previewObject,
  setCtx,
  setGlResult,
  setLights,
  setPreviewObject,
  width,
  height,
}) => {
  const sceneRef = useRef<{ [key: string]: any }>({});

  const { scene, camera, threeDomRef, renderer } = useThree((time) => {
    const { current: mesh } = meshRef;
    if (!mesh) {
      return;
    }

    if (sceneRef.current.shadersUpdated) {
      const gl = renderer.getContext();

      const { fragmentShader, vertexShader, program } = renderer.properties
        .get(mesh.material)
        .programs.values()
        .next().value;

      const compiled = gl.getProgramParameter(program, gl.LINK_STATUS);
      if (!compiled) {
        const log = gl.getProgramInfoLog(program)?.trim();

        setGlResult({
          fragError: gl.getShaderInfoLog(fragmentShader)?.trim() || log,
          vertError: gl.getShaderInfoLog(vertexShader)?.trim() || log,
          programError: log,
        });
      } else {
        setGlResult({
          fragError: null,
          vertError: null,
          programError: null,
        });
      }

      sceneRef.current.shadersUpdated = false;
    }

    if (lightsRef.current) {
      const light = lightsRef.current[0];
      light.position.x = 1.2 * Math.sin(time * 0.001);
      light.position.y = 1.2 * Math.cos(time * 0.001);
      light.lookAt(
        new three.Vector3(Math.cos(time * 0.0015), Math.sin(time * 0.0015), 0)
      );

      if (lightsRef.current.length > 2) {
        const light = lightsRef.current[1];
        light.position.x = 1.3 * Math.cos(time * 0.0015);
        light.position.y = 1.3 * Math.sin(time * 0.0015);

        light.lookAt(
          new three.Vector3(Math.cos(time * 0.0025), Math.sin(time * 0.0025), 0)
        );
      }
    }

    // @ts-ignore
    if (mesh.material?.uniforms?.time && !Array.isArray(mesh.material)) {
      // @ts-ignore
      mesh.material.uniforms.time.value = time * 0.001;
    }
  });

  const meshRef = useRef<three.Mesh>();
  useMemo(() => {
    if (meshRef.current) {
      scene.remove(meshRef.current);
    }

    let mesh;
    if (previewObject === 'torusknot') {
      const geometry = new three.TorusKnotGeometry(0.6, 0.25, 100, 16);
      mesh = new three.Mesh(geometry);
    } else if (previewObject === 'sphere') {
      const geometry = new three.SphereBufferGeometry(1, 32, 32);
      mesh = new three.Mesh(geometry);
    } else {
      throw new Error('fffffff');
    }
    if (meshRef.current) {
      mesh.material = meshRef.current.material;
    }
    meshRef.current = mesh;
    scene.add(mesh);
  }, [previewObject, scene]);

  const threeTone = useMemo(() => {
    const image = new three.TextureLoader().load('/3tone.jpg');
    image.minFilter = three.NearestFilter;
    image.magFilter = three.NearestFilter;
  }, []);

  const [ctx] = useState<EngineContext<RuntimeContext>>({
    runtime: {
      three,
      renderer,
      meshRef: meshRef,
      scene,
      camera,
      index: 0,
      threeTone,
      cache: { nodes: {} },
    },
    nodes: {},
    debuggingNonsense: {},
  });

  // Inform parent our context is created
  useEffect(() => {
    setCtx<RuntimeContext>(ctx);
  }, [ctx, setCtx]);

  useEffect(() => {
    const { renderer, threeTone, meshRef } = ctx.runtime;
    console.log('oh hai birfday boi boi boiiiii');

    const os1: any = graph.nodes.find(
      (node) => node.name === 'Outline Shader F'
    )?.id;
    const os2: any = graph.nodes.find(
      (node) => node.name === 'Outline Shader V'
    )?.id;
    const fs1: any = graph.nodes.find((node) => node.name === 'Fireball F')?.id;
    const fs2: any = graph.nodes.find((node) => node.name === 'Fireball V')?.id;
    const fc: any = graph.nodes.find(
      (node) => node.name === 'Fluid Circles'
    )?.id;
    const pu: any = graph.nodes.find(
      (node) => node.name === 'Purple Metal'
    )?.id;
    const edgeId: any = graph.nodes.find(
      (node) => node.name === 'Triplanar'
    )?.id;
    const hs1: any = graph.nodes.find(
      (node) => node.name === 'Fake Heatmap F'
    )?.id;
    const hs2: any = graph.nodes.find(
      (node) => node.name === 'Fake Heatmap V'
    )?.id;

    const uniforms = {
      ...three.ShaderLib.phong.uniforms,
      ...three.ShaderLib.toon.uniforms,
      diffuse: { value: new three.Color(0xffffff) },
      // ambientLightColor: { value: new three.Color(0xffffff) },
      color: { value: new three.Color(0xffffff) },
      gradientMap: { value: threeTone },
      // map: { value: new three.TextureLoader().load('/contrast-noise.png') },
      image: {
        value: new three.TextureLoader().load('/contrast-noise.png'),
      },
      [`tExplosion_${fs1}`]: {
        value: new three.TextureLoader().load('/explosion.png'),
      },
      [`tExplosion_${fs2}`]: {
        value: new three.TextureLoader().load('/explosion.png'),
      },
      time: { value: 0 },
      resolution: { value: 0.5 },
      speed: { value: 3 },
      opacity: { value: 1 },
      lightPosition: { value: new three.Vector3(10, 10, 10) },

      roughness: { value: 0.046 },
      metalness: { value: 0.491 },
      clearcoat: { value: 1 },

      [`brightnessX_${pu}`]: { value: 1.0 },
      [`permutations_${pu}`]: { value: 10 },
      [`iterations_${pu}`]: { value: 1 },
      [`uvScale_${pu}`]: { value: new three.Vector2(1, 1) },
      [`color1_${pu}`]: { value: new three.Vector3(0.7, 0.3, 0.8) },
      [`color2_${pu}`]: { value: new three.Vector3(0.1, 0.2, 0.9) },
      [`color3_${pu}`]: { value: new three.Vector3(0.8, 0.3, 0.8) },

      [`scale_${hs1}`]: { value: 1.2 },
      [`power_${hs1}`]: { value: 1 },
      [`scale_${hs2}`]: { value: 1.2 },
      [`power_${hs2}`]: { value: 1 },

      [`baseRadius_${fc}`]: { value: 1 },
      [`colorVariation_${fc}`]: { value: 0.6 },
      [`brightnessVariation_${fc}`]: { value: 0 },
      [`variation_${fc}`]: { value: 8 },
      [`backgroundColor_${fc}`]: { value: new three.Vector3(0.0, 0.0, 0.5) },

      [`fireSpeed_${fs1}`]: { value: 0.6 },
      [`fireSpeed_${fs2}`]: { value: 0.6 },
      [`pulseHeight_${fs1}`]: { value: 0.1 },
      [`pulseHeight_${fs2}`]: { value: 0.1 },
      [`displacementHeight_${fs1}`]: { value: 0.2 },
      [`displacementHeight_${fs2}`]: { value: 0.2 },
      [`turbulenceDetail_${fs1}`]: { value: 0.8 },
      [`turbulenceDetail_${fs2}`]: { value: 0.8 },
      [`brightness`]: { value: 0.8 },

      [`cel0_${edgeId}`]: { value: 1.0 },
      [`cel1_${edgeId}`]: { value: 1.0 },
      [`cel2_${edgeId}`]: { value: 1.0 },
      [`cel3_${edgeId}`]: { value: 1.0 },
      [`cel4_${edgeId}`]: { value: 1.0 },
      [`celFade_${edgeId}`]: { value: 1.0 },
      [`edgeSteepness_${edgeId}`]: { value: 0.1 },
      [`edgeBorder_${edgeId}`]: { value: 0.1 },
      [`color_${edgeId}`]: { value: 1.0 },

      [`color_${os1}`]: { value: new three.Vector3(1, 1, 1) },
      [`color_${os2}`]: { value: new three.Vector3(1, 1, 1) },
      [`start_${os1}`]: { value: 0 },
      [`start_${os2}`]: { value: 0 },
      [`end_${os1}`]: { value: 1 },
      [`end_${os2}`]: { value: 1 },
      [`alpha_${os1}`]: { value: 1 },
      [`alpha_${os2}`]: { value: 1 },
    };
    console.log('applying uniforms', uniforms);

    // the before code
    const newMat = new three.RawShaderMaterial({
      name: 'ShaderFrog Phong Material',
      lights: true,
      uniforms,
      vertexShader: compileResult?.vertexResult,
      fragmentShader: compileResult?.fragmentResult,
      // onBeforeCompile: () => {
      //   console.log('raw shader precomp');
      // },
    });

    meshRef.current.material = newMat;
    sceneRef.current.shadersUpdated = true;
  }, [compileResult, ctx.runtime, graph.nodes]);

  const lightsRef = useRef<three.Object3D[]>([]);
  useMemo(() => {
    // Hack to let this hook get the latest state like ctx, but only update
    // if a certain dependency has changed
    // @ts-ignore
    if (scene.lights === lights) {
      return;
    }
    lightsRef.current.forEach((light) => scene.remove(light));

    if (lights === 'point') {
      const pointLight = new three.PointLight(0xffffff, 1);
      pointLight.position.set(0, 0, 1);
      scene.add(pointLight);
      const helper = new three.PointLightHelper(pointLight, 0.1);
      scene.add(helper);
      lightsRef.current = [pointLight, helper];
    } else {
      const light = new three.SpotLight(0x00ff00, 1, 3, 0.4, 1);
      light.position.set(0, 0, 2);
      scene.add(light);

      const helper = new three.SpotLightHelper(
        light,
        new three.Color(0x00ff00)
      );
      scene.add(helper);

      const light2 = new three.SpotLight(0xff0000, 1, 4, 0.4, 1);
      light2.position.set(0, 0, 2);
      scene.add(light2);

      const helper2 = new three.SpotLightHelper(
        light2,
        new three.Color(0xff0000)
      );
      scene.add(helper2);

      lightsRef.current = [light, light2, helper, helper2];
    }

    if (meshRef.current) {
      meshRef.current.material = loadingMaterial;
    }

    // @ts-ignore
    if (scene.lights) {
      compile(ctx);
    }
    // @ts-ignore
    scene.lights = lights;
  }, [lights, scene, compile, ctx]);

  useEffect(() => {
    if (ctx.runtime?.camera) {
      const { camera, renderer } = ctx.runtime;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
  }, [width, height, ctx.runtime]);

  return (
    <div>
      <div ref={threeDomRef}></div>
      <div className={styles.sceneLabel}>
        {compiling && 'Compiling...'}
        {!compiling &&
          compileResult?.compileMs &&
          `Complile took ${compileResult?.compileMs}ms`}
      </div>
      <div className={styles.sceneControls}>
        <button
          className={styles.button}
          onClick={() => setLights('point')}
          disabled={lights === 'point'}
        >
          Point Light
        </button>
        <button
          className={styles.button}
          onClick={() => setLights('spot')}
          disabled={lights === 'spot'}
        >
          Spot Lights
        </button>
        <button
          className={styles.button}
          onClick={() =>
            setPreviewObject(
              previewObject === 'sphere' ? 'torusknot' : 'sphere'
            )
          }
        >
          {previewObject === 'sphere' ? 'Torus Knot' : 'Sphere'}
        </button>
        {/* <button
          className={styles.button}
          onClick={() => setPauseCompile(!pauseCompile)}
        >
          {pauseCompile ? 'Unpause' : 'Pause'}
        </button> */}
      </div>
    </div>
  );
};

export default ThreeComponent;
