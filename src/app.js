import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requiereAuth } from './middleware/auth.js';
import { manejarErrores, rutaNoEncontrada } from './middleware/errores.js';
import { rutasHealth } from './rutas/health.js';
import { crearRutasAuth } from './rutas/auth.js';
import { rutasCategorias } from './rutas/categorias.js';
import { rutasProductos } from './rutas/productos.js';

// Se crea una app nueva por llamada (el limitador de login vive dentro de cada instancia).
export function crearApp({ registrarPeticiones = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors()); // abierto: prototipo local de desarrollo
  app.use(express.json({ limit: '10kb' }));
  if (registrarPeticiones) app.use(morgan('dev'));

  const v1 = express.Router();
  v1.use(rutasHealth);
  v1.use(crearRutasAuth());
  // Todo lo que sigue exige token.
  v1.use(requiereAuth, rutasCategorias, rutasProductos);
  app.use('/v1', v1);

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
