# Sistema de Control de Tesorería — Grupo Apostólico Omega

Sistema integral de gestión de tesorería, arqueos y conteos físicos de efectivo, control de sobres/bolsas, cajas de transferencias bancarias y auditoría para organizaciones y grupos apostólicos.

---

## 🚀 Características Principales

- **Gestión de Múltiples Cajas:**
  - Cajas de **Efectivo** (con desglose físico de monedas de $0.50 a $20, billetes de $20 a $1,000, y bolsas de monedas por denominación).
  - Cajas de **Transferencias / Banco** (registro directo y simplificado de entradas y salidas bancarias sin desglose físico).
- **Conteos Físicos y Arqueos de Caja:**
  - Auto-guardado del último conteo realizado por caja: solo abre y actualiza lo que haya cambiado.
  - Generación directa de entradas/salidas de ajuste o de movimiento personalizado cuando existe diferencia de cuadre.
  - Historial de conteos con opción de cargar valores previos.
- **Bolsas Personalizadas por Caja:**
  - Creación de bolsas por denominación (ej. $100 pesos de monedas de $1 = 100 monedas) vinculadas individualmente a cada caja.
- **Administración de Usuarios y Permisos:**
  - Roles de acceso: Administrador, Tesorero, Consulta.
  - Edición completa de usuarios (Nombre, Rol) y **cambio de contraseñas** directo desde la interfaz.
- **Arquitectura de Producción:**
  - Backend en **ASP.NET Core 9 (C#)** con SQLite y EF Core.
  - Frontend SPA en **React 19 + TypeScript + Vite + Tailwind CSS**.
  - Servido en un único puerto y binario unificado con `wwwroot`.

---

## 🔑 Credenciales por Defecto (Primer Inicio)

Al iniciar por primera vez, el sistema crea automáticamente las siguientes cuentas:

| Rol | Usuario | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `Admin123!` | Acceso total, usuarios, cajas, auditoría y conteos |
| **Tesorero** | `tesorero` | `Tesorero123!` | Registro de movimientos, conteos físicos y arqueos |
| **Consulta** | `consulta` | `Consulta123!` | Solo visualización de reportes e historial |

> *Recomendación:* Inicia sesión como `admin` y cambia las contraseñas inmediatamente desde el menú de **Usuarios y Permisos**.

---

## 💻 Ejecución en Modo Local (Windows / Mac / Linux)

### Opción 1: Ejecución con el script de 1 clic (Windows)
Haz doble clic en el archivo `iniciar_sistema.bat`. Este script abrirá el backend y la aplicación en tu navegador en `http://localhost:5000`.

### Opción 2: Desde terminal
```bash
# Compilar frontend
cd frontend
npm install
npm run build

# Copiar dist a wwwroot del backend (en Windows PowerShell)
Copy-Item -Recurse -Force "dist\*" "..\backend\wwwroot"

# Iniciar backend
cd ../backend
dotnet run
```
Abre en tu navegador: `http://localhost:5000`

---

## 🌐 Cómo Subirlo a GitHub y Publicarlo en una Web Pública

### Paso 1: Crear tu repositorio en GitHub
1. Entra a [github.com](https://github.com) y crea un nuevo repositorio (por ejemplo: `omega-tesoreria`).
2. **No** selecciones "Add README" ni "Add .gitignore" (ya los tenemos listos).

### Paso 2: Subir el código desde tu computadora
Abre una terminal en esta carpeta (`OmegaTesoreria`) y ejecuta:
```bash
git init
git add .
git commit -m "feat: Sistema de Control de Tesorería Omega listo para producción"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/omega-tesoreria.git
git push -u origin main
```

---

## ☁️ Opciones de Despliegue Web Público Gratuito / Económico

El sistema incluye un `Dockerfile` optimizado y compatibilidad automática con la variable `PORT`. Puedes elegir cualquiera de estos servicios:

### Opción A: Render.com (Recomendado - 100% compatible)
1. Entra a [Render.com](https://render.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **New +** > **Web Service**.
3. Selecciona tu repositorio `omega-tesoreria`.
4. Configuración:
   - **Environment:** `Docker` (Render detectará el `Dockerfile` automáticamente).
   - **Region:** Elige la más cercana (ej. Oregon o Frankfurt).
   - **Instance Type:** Free.
5. (Opcional pero recomendado para persistencia permanente de base de datos):
   - En la pestaña **Disks**, agrega un disco:
     - **Name:** `sqlite-data`
     - **Mount Path:** `/app/database`
     - **Size:** 1 GB
6. Haz clic en **Create Web Service**. ¡En 3 minutos tu sistema estará en una dirección pública `https://tu-app.onrender.com`!

### Opción B: Railway.app
1. Entra a [Railway.app](https://railway.app).
2. Haz clic en **New Project** > **Deploy from GitHub repo**.
3. Selecciona tu repositorio.
4. Railway detectará el `Dockerfile` y desplegará la app automáticamente.
5. Agrega un volumen persistente apuntando a `/app/database` para que los datos nunca se borren.
6. En la pestaña **Settings**, haz clic en **Generate Domain** para obtener tu enlace público `https://...up.railway.app`.

### Opción C: Fly.io
1. Instala el CLI de Fly (`flyctl`).
2. En la raíz del proyecto ejecuta:
   ```bash
   fly launch
   fly volumes create omega_data --size 1
   fly deploy
   ```

---

## 🛡️ Seguridad y Respaldo de Base de Datos
- La base de datos es un único archivo SQLite ubicado en `backend/database/tesoreria.db` (en local) o en `/app/database/tesoreria.db` (en la nube).
- Para hacer un respaldo, simplemente descarga una copia de dicho archivo `.db`.
