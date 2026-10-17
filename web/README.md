# Web pública · TIEMPO CON IA

Esta carpeta contiene una presentación estática. No tiene base de datos, inicio de sesión ni acceso a los archivos del estudio privado. La información sobre funciones futuras se identifica como trabajo en desarrollo.

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

Vite crea `web/dist/`. No hay variables de entorno ni servicios externos.

## Publicar con GitHub y Vercel

1. Entra en <https://vercel.com/> con tu cuenta de GitHub.
2. Pulsa **Add New → Project**. Importa `Pablo06Casta/TIEMPO-CON-IA`. Si Vercel pide permiso para ver repositorios, selecciona solo este repositorio si quieres limitar el acceso.
3. En **Root Directory**, pulsa **Edit** y selecciona `web`.
4. Comprueba **Framework Preset: Vite**. El comando de construcción será `npm run build` y la carpeta de salida `dist`. No añadas variables de entorno ni bases de datos.
5. Revisa el plan antes de pulsar **Deploy**. Vercel Hobby suele servir sitios estáticos de uso personal sin cuota, dentro de sus límites, pero sus condiciones pueden restringir el uso comercial. Si vas a promocionar servicios comerciales y necesitas seguir a coste cero, considera **Cloudflare Pages** con esta misma carpeta (`web`), comando `npm run build` y salida `dist`.
6. Al terminar, Vercel mostrará una dirección `*.vercel.app`. Cada cambio que subas después a `main` en GitHub generará un nuevo despliegue de esta página.

El código que vive fuera de `web` pertenece al estudio privado y no se incluye en la web estática. Publicar el estudio completo en Vercel requerirá migrar su base de datos SQLite y sus archivos a servicios persistentes antes de activarlo.
