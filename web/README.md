# Web pública · TIEMPO CON IA

Esta carpeta contiene una presentación y una biblioteca pública. La biblioteca puede leer recursos publicados desde una base privada de Notion mediante funciones de Vercel; los visitantes solo reciben los datos de las filas marcadas **Publicar**. El catálogo estático de GitHub sigue disponible. La web no tiene acceso al estudio privado de SQLite.

Para crear y actualizar recursos directamente desde el navegador en Notion, sigue la [guía paso a paso](../docs/notion-vercel.md). El token de Notion se configura **solo** como `NOTION_TOKEN` en Vercel, nunca en archivos `VITE_` ni en GitHub.

## Añadir un prompt o una skill al catálogo público

**Todo archivo que añadas a `public/catalog/files/` será accesible para cualquier visitante en el siguiente despliegue.** Revisa el contenido del archivo, incluidos los archivos internos de un ZIP, antes de publicarlo. No incluyas contraseñas, claves, datos personales ni material que no quieras distribuir.

1. Guarda el prompt en `.txt` o `.md`, o la skill en `.md` o `.zip`, con un nombre corto que use letras, números, guiones o guiones bajos. Copia el archivo a `web/public/catalog/files/`.
2. Añade una ficha a `web/public/catalog/catalog.json` con el mismo nombre de archivo. Por ejemplo:

   ```json
   [
     {
       "kind": "prompt",
       "title": "Nombre público del prompt",
       "description": "Qué hace y cuándo puede resultar útil.",
       "file": "nombre-del-prompt.md"
     }
   ]
   ```

3. Ejecuta `npm run build` dentro de `web/`. La construcción comprueba que las fichas tengan un archivo existente y válido.
4. Revisa la página y el archivo descargable. Después de aprobarlos, sube los cambios a `main` en GitHub. Si Vercel ya está conectado, generará una versión nueva automáticamente.

Puedes enviarme aquí el primer `.txt`, `.md` o `.zip` con su título y descripción, y prepararé la ficha y el archivo para que los revises antes de publicarlos.

El **estudio privado** es otra aplicación: allí puedes crear un recurso desde **Biblioteca → Nuevo recurso** o importar una skill ZIP desde **Biblioteca → Importar skill**. Sus datos viven en SQLite en la instalación del estudio; crear algo allí no lo publica en esta web automáticamente. Notion es el editor de la biblioteca pública.

## Revisar en local

```bash
cd web
npm ci
npm run dev
```

Para generar la versión que se publicará:

```bash
npm run build
```

Vite crea `web/dist/`. El catálogo estático funciona sin variables de entorno. La conexión opcional con Notion requiere `NOTION_TOKEN` y `NOTION_DATABASE_ID` en las funciones de Vercel. `vite dev` sirve la parte estática; las funciones `/api` se ejecutan en Vercel.

## Publicar con GitHub y Vercel

1. Entra en <https://vercel.com/> con tu cuenta de GitHub.
2. Pulsa **Add New → Project**. Importa `Pablo06Casta/TIEMPO-CON-IA`. Si Vercel pide permiso para ver repositorios, selecciona solo este repositorio si quieres limitar el acceso.
3. En **Root Directory**, pulsa **Edit** y selecciona `web`.
4. Comprueba **Framework Preset: Vite**. El comando de construcción será `npm run build` y la carpeta de salida `dist`. El catálogo estático no necesita variables. Para conectarlo con Notion, añade después las dos variables indicadas en la [guía](../docs/notion-vercel.md).
5. Revisa el plan antes de pulsar **Deploy**. Vercel Hobby suele servir sitios estáticos de uso personal sin cuota, dentro de sus límites, pero sus condiciones pueden restringir el uso comercial. Si vas a promocionar servicios comerciales y necesitas seguir a coste cero, considera **Cloudflare Pages** con esta misma carpeta (`web`), comando `npm run build` y salida `dist`.
6. Al terminar, Vercel mostrará una dirección `*.vercel.app`. Cada cambio que subas después a `main` en GitHub generará un nuevo despliegue de esta página.

El código que vive fuera de `web` pertenece al estudio privado y no se incluye en la web estática. Publicar el estudio completo en Vercel requerirá migrar su base de datos SQLite y sus archivos a servicios persistentes antes de activarlo.
