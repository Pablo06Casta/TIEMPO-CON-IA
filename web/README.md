# Web pública · TIEMPO CON IA

Esta carpeta contiene la presentación pública y la interfaz de la biblioteca en Vercel. La página consulta un catálogo público con base de datos; el editor y sus datos privados se alojan por separado. La información sobre funciones futuras se identifica como trabajo en desarrollo.

El editor privado no está enlazado desde la web pública. Los recursos publicados se sincronizan con el catálogo público. La página de Vercel consulta el catálogo al cargar, al volver a la pestaña y cada 30 segundos mientras está abierta. El contenido completo de cada recurso publicado es público. Cada ficha abre una página propia con descripción, instrucciones copiables y archivos descargables.

## Complementos de skills

En [Complementos](https://tiempo-con-ia.vercel.app/#complementos), cualquier visitante puede seleccionar dos o más skills publicadas desde GitHub o desde el estudio, añadir archivos propios `.md`, `.txt` o `.zip`, y descargar el conjunto como un ZIP. Incluye `complemento.json`, `LEEME.txt` y una carpeta por skill con su contenido y adjuntos. Si una skill original es un ZIP, se conserva dentro del conjunto. Los archivos propios se procesan en el navegador y no se publican. El complemento creado por un visitante tampoco se añade al catálogo público.

Para publicar un complemento preparado para todos, usa los IDs de al menos dos skills ya publicadas. En el caso de una skill del estudio, el ID aparece en el enlace de su página `/recurso.html?id=...`. Desde `web/` ejecuta:

```bash
npm run complements:add -- --title "Mi complemento" --description "Qué resuelve" --skills skill-uno,skill-dos
npm run build
```

El comando añade o actualiza su ficha en `public/catalog/complements.json`. También puedes enviarme las skills y explicar cómo quieres agruparlas en un chat con este repositorio y `@TIEMPO-CON-IA-WEB`. Cada archivo del ZIP está limitado a 20 MB, con un máximo de 20 skills y 80 MB por complemento. La web no requiere cuentas nuevas para crear o descargar complementos.

El estudio privado incluido en la raíz de este repositorio también tiene **Complementos → Nuevo complemento**. Con `GITHUB_CONTENTS_TOKEN` configurado en su servidor, **Guardar y publicar** escribe esta misma ficha en GitHub y activa el despliegue automático de Vercel. El editor privado alojado por separado necesita su propio cambio de código para mostrar esta opción.

El pie de página enlaza a `/legal.html`, con información sobre autoría, propiedad intelectual, privacidad y cookies. Esta versión no configura cookies de analítica o publicidad ni incluye un banner de consentimiento: si se incorporan tecnologías no necesarias, habrá que añadir consentimiento previo y actualizar esa información. Antes de iniciar una actividad económica, habrá que completar los datos de identificación y contacto que resulten exigibles.

## Publicar un recurso conmigo

En un chat de Codex con el repositorio `Pablo06Casta/TIEMPO-CON-IA` seleccionado, adjunta un `.txt`, `.md` o `.zip` (o pega el texto del prompt) y escribe `@TIEMPO-CON-IA-WEB`. Puedes incluir título, descripción y tipo; si faltan, los prepararé a partir del contenido. Revisaré el archivo, actualizaré el catálogo, construiré la web y subiré los cambios a GitHub. Vercel desplegará la nueva versión al recibir el commit. Para modificar un recurso, envíalo otra vez con la misma marca e indica cuál reemplaza.

La marca es una instrucción escrita para el agente en un chat que usa este repositorio; no es una mención global registrada en todos los chats. La [skill de publicación](../.agents/skills/tiempo-con-ia-web/SKILL.md) contiene el procedimiento reutilizable.

## Añadir un recurso manualmente

**Todo archivo que añadas a `public/catalog/files/` será accesible para cualquier visitante en el siguiente despliegue.** Revisa el contenido del archivo, incluidos los archivos internos de un ZIP, antes de publicarlo. No incluyas contraseñas, claves, datos personales ni material que no quieras distribuir.

1. Guarda el recurso como `.txt`, `.md` o `.zip`, hasta 20 MB.
2. Desde `web/`, ejecuta:

   ```bash
   npm run catalog:add -- --source /ruta/al/archivo.md --kind prompt --title "Nombre del recurso" --description "Qué hace y cuándo usarlo" --tags "redacción,productividad"
   ```

   Los tipos posibles son `prompt` (prompts simples), `skill` y `agente`, `automatizacion` u `otro` (otros recursos). Los complementos de skills se crean por separado con `complements:add`. `--tags` admite etiquetas separadas por comas, hasta 12 etiquetas de 40 caracteres. Si lo omites al actualizar una ficha, se conservan sus etiquetas. El comando copia el archivo a `web/public/catalog/files/` y añade una ficha a `web/public/catalog/catalog.json`. Si publicas de nuevo el mismo título y tipo, actualiza la ficha. Para cambiar su título sin duplicar la ficha, usa `--id` con el ID ya registrado. Una ficha tiene este aspecto:

   ```json
   [
     {
       "id": "prompt-nombre-publico-del-prompt",
       "kind": "prompt",
       "title": "Nombre público del prompt",
       "description": "Qué hace y cuándo puede resultar útil.",
      "tags": ["redacción", "productividad"],
       "file": "prompt-nombre-publico-del-prompt.md"
     }
   ]
   ```

3. Ejecuta `npm run build` dentro de `web/`. La construcción comprueba que las fichas tengan un archivo existente y válido.
4. Revisa los cambios y súbelos a `main` en GitHub. Si Vercel ya está conectado, generará una versión nueva automáticamente.

Puedes enviarme aquí el primer `.txt`, `.md` o `.zip` con `@TIEMPO-CON-IA-WEB` para publicarlo.

El **estudio** enlazado desde la web es otra aplicación: allí puedes crear un recurso desde **Biblioteca → Nuevo recurso**. Guardarlo publica su título, descripción, etiquetas y contenido en el catálogo que consulta Vercel. El proyecto local de fase 1 que vive fuera de `web/` sigue siendo una instalación independiente.

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

Vite crea `web/dist/`. La biblioteca consulta el catálogo público de TIEMPO CON IA.

## Publicar con GitHub y Vercel

1. Entra en <https://vercel.com/> con tu cuenta de GitHub.
2. Pulsa **Add New → Project**. Importa `Pablo06Casta/TIEMPO-CON-IA`. Si Vercel pide permiso para ver repositorios, selecciona solo este repositorio si quieres limitar el acceso.
3. En **Root Directory**, pulsa **Edit** y selecciona `web`.
4. Comprueba **Framework Preset: Vite**. El comando de construcción será `npm run build` y la carpeta de salida `dist`. No añadas variables de entorno ni bases de datos.
5. Revisa el plan antes de pulsar **Deploy**. Vercel Hobby suele servir sitios estáticos de uso personal sin cuota, dentro de sus límites, pero sus condiciones pueden restringir el uso comercial. Si vas a promocionar servicios comerciales y necesitas seguir a coste cero, considera **Cloudflare Pages** con esta misma carpeta (`web`), comando `npm run build` y salida `dist`.
6. Al terminar, Vercel mostrará una dirección `*.vercel.app`. Cada cambio que subas después a `main` en GitHub generará un nuevo despliegue de esta página.

El código que vive fuera de `web` pertenece al estudio privado y no se incluye en la web estática. Publicar el estudio completo en Vercel requerirá migrar su base de datos SQLite y sus archivos a servicios persistentes antes de activarlo.
