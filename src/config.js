import 'dotenv/config';

function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} (revisa .env).`);
  return valor;
}

export const config = {
  puerto: Number(process.env.PORT ?? 3000),
  databaseUrl: requerida('DATABASE_URL'),
  jwtSecret: requerida('JWT_SECRET'),
  jwtExpiraSegundos: Number(process.env.JWT_EXPIRA_SEGUNDOS ?? 28800),
  loginMaxIntentosPorMinuto: 10,
};
