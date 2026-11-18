// Genera hashes bcrypt (cost 10) para las contraseñas de la semilla.
// Uso: npm run semilla:hash -- "Refconect2026!" "Admin2026!"
import bcrypt from 'bcryptjs';

const claves = process.argv.slice(2);
if (claves.length === 0) {
  console.error('Uso: npm run semilla:hash -- "<contraseña>" ...');
  process.exit(1);
}
for (const clave of claves) {
  console.log(`${clave}\t${bcrypt.hashSync(clave, 10)}`);
}
