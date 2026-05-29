import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Loader GLTF compartido para todo el juego. Configura MeshoptDecoder para que
// los modelos comprimidos con meshopt (EXT_meshopt_compression) se decodifiquen
// en runtime. Es inofensivo para los .glb sin comprimir: si el archivo no usa
// la extension, el decoder simplemente no se invoca. Las texturas webp las
// decodifica el navegador de forma nativa — no requieren transcoder.
//
// Punto unico para añadir mas decoders en el futuro (DRACO / KTX2) sin tocar
// cada call-site.
export function createGLTFLoader() {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}
