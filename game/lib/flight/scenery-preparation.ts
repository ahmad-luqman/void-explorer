import { Vector3 } from 'three';
import { ContactSurface, type ContactData } from './contact';
import { generateScenery, type SurfaceProp } from './scenery';
import { fromPlanet, planetRotation } from './rotation';
import type { Body } from './universe';

/** Worker output lives in the unturned planetary frame, like contact geometry. */
export type PreparedScenery = {
  bodyId: string;
  focus: number[];
  props: (Omit<SurfaceProp, 'point' | 'normal'> & {
    point: number[];
    normal: number[];
  })[];
};

export function prepareScenery(
  data: ContactData,
  body: Body,
  focus: Vector3,
): PreparedScenery {
  const nativeBody = {
    ...body,
    position: new Vector3(),
    rotationClock: undefined,
  };
  const patch = new ContactSurface(data, nativeBody);
  return {
    bodyId: body.id,
    focus: focus.toArray(),
    props: generateScenery(patch, focus).map((prop) => ({
      ...prop,
      point: prop.point.toArray(),
      normal: prop.normal.toArray(),
    })),
  };
}

export function restorePreparedScenery(data: PreparedScenery, body: Body) {
  const rotation = planetRotation(body);
  return data.props.map((prop) => ({
    ...prop,
    point: fromPlanet(new Vector3().fromArray(prop.point), body),
    normal: new Vector3().fromArray(prop.normal).applyQuaternion(rotation),
  }));
}
