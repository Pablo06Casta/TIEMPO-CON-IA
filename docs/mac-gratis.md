# Usar TIEMPO CON IA desde tus dispositivos sin Oracle

Tu Mac ejecuta la aplicación; Tailscale crea una dirección HTTPS privada para el móvil y otros ordenadores. No hay cuota de alojamiento ni dominio. **El Mac debe estar encendido, con internet y con tu sesión iniciada** para que funcione. Si se apaga, se duerme o se corta la conexión, la web deja de estar disponible. Mantenerlo encendido consume electricidad.

## 1. Instalar en el Mac

1. Instala **Node.js 24** gratis desde <https://nodejs.org/en/download>. Elige el instalador para macOS y completa sus pantallas.
2. Abre <https://github.com/Pablo06Casta/TIEMPO-CON-IA>. Pulsa el botón verde **Code → Download ZIP**. Abre el ZIP en **Descargas**. Debe aparecer la carpeta `TIEMPO-CON-IA-main`.
3. Abre **Terminal** (Finder → Aplicaciones → Utilidades → Terminal). Copia estas dos líneas, una cada vez:

   ```bash
   cd ~/Downloads/TIEMPO-CON-IA-main
   bash scripts/mac-install.sh
   ```

4. La instalación puede tardar unos minutos. Escribe el correo y la contraseña que quieras usar en esta copia. La contraseña no se muestra al escribir. Cuando termine, abre <http://127.0.0.1:3000/login> en Safari e inicia sesión.

El instalador guarda los datos en `~/Library/Application Support/TIEMPO-CON-IA`, separados de la carpeta descargada. Configura la aplicación para arrancar cada vez que inicies sesión en el Mac. El correo y la contraseña del entorno Codex no se copian automáticamente: esta es una instalación nueva. Conserva la carpeta `TIEMPO-CON-IA-main`; el arranque la necesita.

## 2. Acceder desde el móvil u otro ordenador

1. Instala Tailscale gratis en el Mac desde <https://tailscale.com/download/mac> e inicia sesión. Puedes crear la cuenta con un proveedor de acceso que ya uses; no hace falta Oracle.
2. En el **Terminal del Mac**, ejecuta `tailscale serve --bg 3000` y después `tailscale serve status`. Copia la dirección `https://…ts.net` que aparezca. Si Tailscale pide activar HTTPS en el navegador, sigue sus indicaciones.
3. En cada móvil u ordenador desde el que quieras acceder, instala Tailscale desde <https://tailscale.com/download>, entra en la misma red privada y abre esa dirección HTTPS en el navegador. Después inicia sesión en TIEMPO CON IA.

La dirección es privada para los dispositivos que autorices en Tailscale. No abras el puerto 3000 en el router ni publiques tu IP.

## Mantenerlo disponible

- Deja el Mac conectado a la corriente, abierto si es un portátil y con conexión a internet. El instalador usa `caffeinate` para evitar el reposo por inactividad mientras la aplicación está funcionando; cerrar la tapa de un portátil puede seguir suspendiéndolo.
- Después de reiniciar el Mac, inicia sesión en tu usuario. El servicio arranca automáticamente. Tailscale también debe estar abierto y conectado.
- Para comprobar la aplicación en el propio Mac, abre <http://127.0.0.1:3000/login>. Si no carga, mira los registros `server.error.log` y `server.log` en `~/Library/Application Support/TIEMPO-CON-IA`.
- Para hacer una copia, ejecuta estas líneas en Terminal. La aplicación se detendrá unos segundos. El archivo aparecerá en `backups/`, dentro de la carpeta descargada; cópialo luego a otro disco o servicio de tu elección:

  ```bash
  cd ~/Downloads/TIEMPO-CON-IA-main
  launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.tiempoconia.studio.plist"
  DATA_DIR="$HOME/Library/Application Support/TIEMPO-CON-IA" npm run backup
  launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.tiempoconia.studio.plist"
  ```

Esta solución no precisa verificar ninguna tarjeta, pero la disponibilidad depende de que tu Mac permanezca encendido. Si necesitas una web accesible aun con el Mac apagado, hará falta una máquina externa con almacenamiento persistente.
