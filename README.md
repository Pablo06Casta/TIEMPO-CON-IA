# TIEMPO CON IA · Fase 1

Estudio privado para crear y organizar prompts, skills, agentes documentales, automatizaciones y proyectos. Esta entrega es una aplicación local de una sola instancia. No publica recursos ni llama a modelos de pago.

La [web pública](web/README.md) se construye de forma independiente desde `web/`. Su biblioteca muestra recursos publicados desde GitHub y desde el catálogo público del estudio. Para publicar mediante Codex, adjunta un archivo en un chat con este repositorio y escribe `@TIEMPO-CON-IA-WEB`. No expone los datos privados del estudio.

La web también permite [crear complementos de skills](web/README.md#complementos-de-skills): los visitantes pueden combinar recursos publicados y archivos propios en un ZIP, y el propietario puede publicar conjuntos preparados para todos.

## Decisiones técnicas y coste

- **Next.js 16 + React 19 + TypeScript:** una sola aplicación para la interfaz y la API. Facilita el desarrollo y evita un servicio adicional.
- **SQLite integrada en Node 24:** persistencia local sin coste ni credenciales de un servicio externo. Requiere un volumen persistente y copias de seguridad. Para varios servidores o colaboradores habría que migrar a PostgreSQL.
- **CSS propio y componentes React:** diseño claro, adaptable al móvil y sin dependencia de una plantilla. Azul tinta, verde azulado, tipografía del sistema y animaciones discretas.
- **Archivos en `.data/uploads`:** almacenamiento privado por defecto, servido únicamente a usuarios autenticados. En un despliegue con varias instancias se sustituiría por almacenamiento privado compartido.

No se necesita Supabase ni Vercel para desarrollar o probar esta fase. Un despliegue público y cualquier servicio de pago requieren decisión y autorización aparte.

## Puesta en marcha

Para tenerla disponible las 24 horas desde tus dispositivos con alojamiento Always Free, sigue la [guía de Oracle y Tailscale](docs/oracle-gratis.md). La disponibilidad gratuita depende de la capacidad y las condiciones de esas plataformas.

Si prefieres no usar Oracle y puedes mantener tu Mac encendido, sigue la [guía gratuita para Mac y Tailscale](docs/mac-gratis.md).

Requiere **Node 24** y npm. Desde la raíz del repositorio:

```bash
npm ci
npm run build
```

Antes del primer acceso, establece `OWNER_EMAIL` y `OWNER_PASSWORD` (mínimo 12 caracteres) en el entorno de ejecución y ejecuta:

```bash
npm run owner:create
npm run dev
```

El creador de propietario se puede volver a ejecutar para cambiar la contraseña: cierra todas las sesiones anteriores. No guardes la contraseña en el repositorio ni la pases como argumento de línea de comandos. La aplicación usa `DATA_DIR` si quieres situar la base de datos y los archivos fuera de `.data`.

Abre la dirección local que indique Next.js y accede con la cuenta creada. La aplicación escucha solo en `127.0.0.1` durante el desarrollo.

## Funciones de esta entrega

- Inicio de sesión del propietario con contraseña derivada mediante scrypt, cookie HttpOnly y sesiones revocables.
- Biblioteca con tarjetas y lista, búsqueda, filtro, categorías y etiquetas; creación, edición, copia, archivo y eliminación confirmada.
- Editor Markdown con vista previa y versiones persistentes; restaurar crea una versión nueva.
- Campos documentales propios de skills y agentes; exportación de recursos en JSON. Los agentes no se ejecutan.
- Importación de skills ZIP con `SKILL.md`, conservando el ZIP original y su estructura para descargarlo de nuevo. Los ZIP no se ejecutan ni extraen al disco.
- Subida múltiple con arrastrar y soltar, progreso, metadatos, previsualización segura para formatos admitidos y descarga privada. Máximo 10 archivos por petición y 20 MB por archivo.
- Proyectos que vinculan recursos existentes sin duplicarlos.

## Comprobación

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run smoke
```

`smoke` inicia el servidor construido en el puerto 3409, crea una cuenta aleatoria en un directorio temporal y comprueba acceso, recursos, versiones, proyectos, archivos y ZIP. No toca los datos del estudio.

## Datos y seguridad

`DATA_DIR` contiene `app.sqlite` y `uploads/`. Conserva ambos juntos. Para hacer una copia, detén el servidor y ejecuta `npm run backup`; el archivo se guarda en `backups/`, ignorado por Git. Para restaurar, detén el servidor, conserva una copia del estado actual y extrae el archivo en un directorio vacío que usarás como `DATA_DIR`.

La API valida datos y permisos en el servidor; no existen rutas públicas de descarga. Las solicitudes que modifican datos verifican el origen cuando el navegador lo envía. El acceso limita intentos fallidos durante 15 minutos. El contenido Markdown no permite HTML sin procesar.

## Alcance pendiente

La Fase 1 cubre un estudio privado funcional. Aún no hay autenticación para colaboradores, sincronización entre servidores, edición colaborativa, análisis antivirus de archivos ni copias automáticas externas. El ZIP se conserva y puede descargarse; su compatibilidad con herramientas concretas debe verificarse antes de ofrecerla comercialmente. Las Fases 2 a 5 del documento de producto, incluido el showroom y el CRM, no están implementadas.
