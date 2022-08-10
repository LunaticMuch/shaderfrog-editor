import { CoreNode, NodeInput, NodeOutput } from './core-node';

type Vector = 'vector2' | 'vector3' | 'vector4';
type Mat =
  | 'mat2'
  | 'mat3'
  | 'mat4'
  | 'mat2x2'
  | 'mat2x3'
  | 'mat2x4'
  | 'mat3x2'
  | 'mat3x3'
  | 'mat3x4'
  | 'mat4x2'
  | 'mat4x3'
  | 'mat4x4';

export type GraphDataType = Vector | Mat | 'sampler2D' | 'number' | 'array';

export interface NumberNode extends CoreNode {
  type: 'number';
  value: string;
  range?: [number, number];
  stepper?: number;
}
export const numberNode = (
  id: string,
  name: string,
  value: string,
  optionals?: {
    range?: [number, number];
    stepper?: number;
    inputs?: NodeInput[];
    outputs?: NodeOutput[];
  }
): NumberNode => ({
  type: 'number',
  id,
  name,
  value,
  inputs: optionals?.inputs || [],
  outputs: optionals?.outputs || [
    {
      name: 'out',
      id: '1',
      category: 'data',
    },
  ],
  range: optionals?.range,
  stepper: optionals?.stepper,
});

export type NumberDataUniform = Omit<NumberNode, 'id' | 'inputs' | 'outputs'>;

export const numberUniformData = (
  name: string,
  value: string,
  range?: [number, number],
  stepper?: number
): NumberDataUniform => ({ type: 'number', name, value, range, stepper });

export type Vector2 = [string, string];
export type Vector3 = [string, string, string];
export type Vector4 = [string, string, string, string];

export interface Vector2Node extends CoreNode {
  type: 'vector2';
  dimensions: 2;
  value: Vector2;
}
export interface Vector3Node extends CoreNode {
  type: 'vector3';
  dimensions: 3;
  value: Vector3;
}
export interface Vector4Node extends CoreNode {
  type: 'vector4';
  dimensions: 4;
  value: Vector4;
}

export function vectorNode(
  id: string,
  name: string,
  value: Vector2 | Vector3 | Vector4
): Vector2Node | Vector3Node | Vector4Node {
  return {
    id,
    name,
    inputs: [],
    outputs: [
      {
        name: 'out',
        id: '1',
        category: 'data',
      },
    ],
    ...(value.length === 2
      ? { value, dimensions: 2, type: 'vector2' }
      : value.length === 3
      ? { value, dimensions: 3, type: 'vector3' }
      : { value, dimensions: 4, type: 'vector4' }),
  };
}

export type Vector2DataUniform = Omit<Vector2Node, 'id' | 'inputs' | 'outputs'>;
export type Vector3DataUniform = Omit<Vector3Node, 'id' | 'inputs' | 'outputs'>;
export type Vector4DataUniform = Omit<Vector4Node, 'id' | 'inputs' | 'outputs'>;

export const vectorUniformData = (
  name: string,
  value: Vector2 | Vector3 | Vector4
): Vector2DataUniform | Vector3DataUniform | Vector4DataUniform => ({
  name,
  ...(value.length === 2
    ? { value, dimensions: 2, type: 'vector2' }
    : value.length === 3
    ? { value, dimensions: 3, type: 'vector3' }
    : { value, dimensions: 4, type: 'vector4' }),
});

// When defining nodes, these are the types allowed in uniforms
export type UniformDataType =
  | NumberDataUniform
  | Vector2DataUniform
  | Vector3DataUniform
  | Vector4DataUniform;

export type DataNode = NumberNode | Vector2Node | Vector3Node | Vector4Node;
