import { BufferAttribute, BufferGeometry } from 'three';
import { type ContactData, ContactSurface } from './contact';
import { contactNormalBlend } from './contact-shading';
import { createTerrainSkirt } from './terrain-seam';
import type { Body } from './universe';

function meshNormals(positions: Float32Array, indices: Uint32Array) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal.array as Float32Array;
  geometry.dispose();
  return normals;
}
/** Worker-prepared attributes derived from the unchanged authoritative contact mesh.
 * These buffers are disposable; persistent caches retain only ContactData.
 */
export function prepareContactRenderData(data: ContactData, body: Body) {
  const skirt = createTerrainSkirt(new ContactSurface(data, body));
  return {
    normals: meshNormals(data.positions, data.indices),
    smooth: contactNormalBlend(data.axis),
    skirt: { ...skirt, normals: meshNormals(skirt.positions, skirt.indices) },
  };
}
export type ContactRenderData = ReturnType<typeof prepareContactRenderData>;
export function contactRenderBuffers(render: ContactRenderData) {
  return [
    render.normals.buffer,
    render.smooth.buffer,
    render.skirt.positions.buffer,
    render.skirt.colors.buffer,
    render.skirt.indices.buffer,
    render.skirt.normals.buffer,
  ] as ArrayBuffer[];
}
