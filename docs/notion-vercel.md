# Conectar Notion con la web de TIEMPO CON IA

Notion será el editor y almacén de tus recursos. La [web de Vercel](https://tiempo-con-ia.vercel.app/#biblioteca) leerá las filas marcadas **Publicar** al cargar la biblioteca. Los visitantes verán título, descripción, tipo y un enlace al archivo. No necesitan cuenta de Notion. La base de datos puede seguir siendo privada.

## 1. Crear la base de datos en Notion

1. En Notion, pulsa **Nueva página → Tabla → Nueva base de datos**. Usa una tabla de página completa y llámala, por ejemplo, **Recursos TIEMPO CON IA**.
2. Deja la primera columna como **Título** (puedes llamarla `Nombre`). Añade estas cuatro propiedades con estos nombres y tipos. `tipo`, `descripción` y `archivo` también pueden estar en minúsculas; usa **`Publicar`** exactamente así para la casilla:

   | Propiedad | Tipo en Notion | Qué poner |
   | --- | --- | --- |
   | `Tipo` | Selección | `Prompt`, `Skill`, `Agente`, `Automatización` u `Otro` |
   | `Descripción` | Texto | Una explicación corta para la ficha pública |
   | `Archivo` | Archivos y contenido multimedia | Un `.txt`, `.md` o `.zip` |
   | `Publicar` | Casilla de verificación | Déjala desmarcada mientras preparas el recurso |

3. Crea una fila de prueba. Escribe el título y la descripción, selecciona el tipo y adjunta el archivo. **No marques `Publicar` todavía.**

El plan gratuito de Notion puede limitar el tamaño de cada archivo; comprueba el límite de tu cuenta antes de subir ZIP grandes.

## 2. Autorizar la lectura desde la web

1. Entra en [Mis integraciones de Notion](https://www.notion.so/my-integrations) con la misma cuenta de Notion. Pulsa **New integration** o **Crear integración**. Llámala `TIEMPO CON IA web`, selecciona tu espacio de trabajo y concede **Read content**. No necesita permiso de escritura: seguirás editando los recursos en Notion.
2. Abre la integración y copia su **Internal Integration Secret**. **No lo pegues en este chat, en GitHub ni en el código.** Lo introducirás en Vercel en el paso 3.
3. Vuelve a la base de datos de Notion. Pulsa `•••` arriba a la derecha → **Connections / Conexiones** → **Add connections** y selecciona `TIEMPO CON IA web`. Este paso permite que la integración lea solo esa base de datos.
4. En esa misma página, pulsa **Compartir → Copiar enlace**. Guarda el enlace para el paso 3.

## 3. Configurar Vercel

1. Entra en [Vercel Dashboard](https://vercel.com/dashboard) y abre tu proyecto **tiempo-con-ia**.
2. Abre **Settings → Environment Variables**. Añade estas dos variables para **Production**:

   | Nombre | Valor |
   | --- | --- |
   | `NOTION_TOKEN` | El secreto de la integración de Notion |
   | `NOTION_DATABASE_ID` | El enlace completo de la base de datos copiado en Notion (también acepta solo su ID) |

3. Guarda las variables. Abre **Deployments**, busca el último despliegue y pulsa `••• → Redeploy`. Las variables se aplican al nuevo despliegue. No hacen falta variables que empiecen por `VITE_`.
4. Abre <https://tiempo-con-ia.vercel.app/api/catalog>. Si la conexión está lista, verás `"configured":true` y una lista `"resources"`, aunque todavía esté vacía. Si ves `"configured":false`, revisa las variables y el nuevo despliegue.

Si la base de datos tiene **varias fuentes de datos** y la web no carga, habrá que añadir `NOTION_DATA_SOURCE_ID` con el ID de la fuente concreta. Para empezar, usa una base nueva con una sola tabla.

## 4. Publicar y actualizar recursos

1. Revisa que el archivo no contenga información privada. Recuerda que cualquier persona podrá descargarlo.
2. Marca la casilla **Publicar** en la fila de Notion.
3. Abre [la biblioteca](https://tiempo-con-ia.vercel.app/#biblioteca). La ficha aparecerá al actualizar la página; la caché puede tardar unos **5 minutos**. No tienes que editar GitHub ni volver a desplegar por cada recurso.
4. Para corregirlo, edita la fila en Notion. Para ocultarlo, desmarca **Publicar**. Cada nueva descarga comprueba de nuevo la casilla antes de abrir el archivo; los enlaces temporales de Notion que alguien ya haya obtenido pueden seguir funcionando hasta que caduquen.

Si la ficha no aparece, verifica primero que `Publicar` está marcado, que la fila tiene título y archivo, y que la integración está conectada a la base de datos. Después revisa **Vercel → Logs** del último despliegue. La web conserva el catálogo estático de GitHub como respaldo, separado de Notion.

## Coste y disponibilidad

Esta integración utiliza Notion y funciones de Vercel dentro de los límites de sus planes gratuitos. Comprueba sus condiciones vigentes y el uso del proyecto: **coste cero no implica capacidad ilimitada ni disponibilidad garantizada**. El plan Hobby de Vercel también puede restringir usos comerciales.
