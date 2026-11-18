import { crearApp } from './app.js';
import { config } from './config.js';

// 0.0.0.0 para que el emulador Android (10.0.2.2) y dispositivos en la red lleguen a la API.
crearApp().listen(config.puerto, '0.0.0.0', () => {
  console.log(`RefConect API escuchando en http://0.0.0.0:${config.puerto}/v1`);
});
