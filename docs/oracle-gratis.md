# TIEMPO CON IA en Oracle Always Free

Esta guía permite usar el estudio desde tus dispositivos sin pagar alojamiento. La aplicación y sus archivos vivirán en una máquina virtual de Oracle; Tailscale dará una dirección HTTPS privada. En cada dispositivo desde el que quieras entrar tendrás que instalar Tailscale e iniciar sesión en tu red privada.

**Antes de empezar:** Oracle suele pedir una tarjeta para verificar la cuenta. La capacidad gratuita depende de la región. Consulta los límites y condiciones vigentes en [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) y [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm). Crea solo recursos que la consola marque como **Always Free**. No pulses opciones de actualización de cuenta ni selecciones una forma de pago por uso. Si la forma gratuita no está disponible, detente: no cambies a una de pago.

## 1. Crear la máquina virtual

1. Abre <https://www.oracle.com/cloud/free/> y crea una cuenta **Oracle Cloud Free Tier**. Completa la verificación que pida Oracle. No compartas la tarjeta, contraseña ni códigos de verificación en el chat.
2. En la consola de Oracle, abre el menú **☰ → Compute → Instances → Create instance**.
3. Ponle el nombre `tiempo-con-ia`. Elige **Ubuntu 24.04** y una forma **VM.Standard.A1.Flex** marcada **Always Free eligible**. Configura **1 OCPU y 6 GB de RAM**; está dentro de la asignación Always Free publicada para A1, pero confirma la etiqueta y el resumen de coste en la consola antes de crearla.
4. Conserva el volumen de arranque predeterminado, siempre que aparezca dentro del límite Always Free. En red, crea la VCN/subred predeterminada y asigna una IP pública para conectarte por SSH. Abre solo el puerto **22** (SSH); no abras el **3000**.
5. En **Add SSH keys**, usa **Generate a key pair for me** y descarga la **clave privada** al Mac. Guárdala; no se puede volver a descargar. Pulsa **Create** solo si la consola confirma que la máquina y el volumen son elegibles para Always Free.
6. Espera a que el estado sea **Running** y copia la **Public IP address**. Si Oracle muestra falta de capacidad, prueba otro dominio de disponibilidad gratuito o espera; no elijas una máquina de pago.

## 2. Instalar TIEMPO CON IA

En el Mac, abre **Terminal** (Finder → Aplicaciones → Utilidades → Terminal). Sustituye `RUTA_CLAVE` por la ruta del archivo de clave descargado e `IP_PUBLICA` por la IP de Oracle:

```bash
chmod 600 RUTA_CLAVE
ssh -i RUTA_CLAVE ubuntu@IP_PUBLICA
```

Ya dentro de la máquina de Oracle, ejecuta estas líneas una a una:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
git clone https://github.com/Pablo06Casta/TIEMPO-CON-IA.git
cd TIEMPO-CON-IA
mkdir -p data backups
sudo chown 1000:1000 data backups
sudo chmod 700 data backups
sudo docker compose build
sudo docker compose run --rm app bash scripts/set-owner.sh
sudo docker compose up -d
curl -I http://127.0.0.1:3000/login
```

En el paso `set-owner.sh`, escribe tu correo y una contraseña nueva de al menos 12 caracteres. Mientras escribes la contraseña no aparecen caracteres en pantalla; es normal. El correo y la contraseña configurados en Codex no se transfieren solos a Oracle. La última orden debe mostrar una respuesta HTTP, normalmente `200`.

La aplicación solo escucha en `127.0.0.1` dentro de la máquina. No abras el puerto 3000 al público.

## 3. Acceso privado desde otros dispositivos

1. Crea una cuenta personal gratuita en <https://tailscale.com/>. En la máquina de Oracle, sigue las instrucciones de instalación de Tailscale para **Ubuntu** que muestra su web. Si te da el instalador oficial, termina ejecutando `sudo tailscale up` y abre en tu navegador el enlace de autorización que muestre.
2. En la máquina de Oracle, ejecuta `sudo tailscale serve --bg 3000` y después `tailscale serve status`. Copia la dirección `https://…ts.net` que aparezca. Si Tailscale pide activar HTTPS, acepta en el panel de administración de tu propia red.
3. Instala Tailscale en el Mac, móvil o tableta desde <https://tailscale.com/download>, inicia sesión en la misma red privada y abre esa dirección HTTPS en el navegador. Entra con la cuenta creada en el paso 2.

La dirección de Tailscale es privada: solo funcionan dispositivos autorizados en tu red. Para acceder desde un dispositivo nuevo debes iniciar sesión en Tailscale allí. La máquina de Oracle seguirá encendida aunque apagues el Mac.

## Copias y mantenimiento

La base de datos y los archivos están en `data/` de la máquina virtual. Detén la aplicación antes de crear una copia coherente:

```bash
cd ~/TIEMPO-CON-IA
sudo docker compose stop
sudo docker compose run --rm app npm run backup
sudo docker compose up -d
```

La copia queda en `~/TIEMPO-CON-IA/backups/`. Descárgala periódicamente al Mac: si se pierde la máquina virtual, una copia en el mismo disco también se pierde. No subas `data/`, `backups/` ni contraseñas a GitHub.

Para actualizar el código tras guardar una copia:

```bash
cd ~/TIEMPO-CON-IA
git pull --ff-only
sudo docker compose up -d --build
```

El servicio se inicia de nuevo tras reiniciar la máquina. Si Oracle cambia sus condiciones o suspende la cuenta, la disponibilidad puede interrumpirse. El software no activa pagos; comprueba siempre en la consola que sigues en Always Free.
