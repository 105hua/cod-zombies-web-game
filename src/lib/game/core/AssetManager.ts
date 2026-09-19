// Lazy-import this module when models are needed. The caller owns the returned
// AssetContainer: addAllToScene() to display it, dispose() when no longer needed.
import '@babylonjs/loaders/glTF';
export { LoadAssetContainerAsync as loadModel } from '@babylonjs/core/Loading/sceneLoader';
