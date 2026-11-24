# Etapa 1: Compilar Frontend React
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Etapa 2: Compilar Backend ASP.NET Core 9
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build-backend
WORKDIR /src

COPY backend/backend.csproj ./backend/
RUN dotnet restore ./backend/backend.csproj

COPY backend/ ./backend/
# Copiar el frontend compilado en la carpeta wwwroot del backend
COPY --from=build-frontend /app/frontend/dist ./backend/wwwroot

WORKDIR /src/backend
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Etapa 3: Imagen Final de Ejecución
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Puerto por defecto (sobreescribible por nubes como Render/Railway mediante la variable PORT)
ENV PORT=8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DATABASE_DIR=/app/database

# Directorio para persistencia de base de datos SQLite
RUN mkdir -p /app/database

COPY --from=build-backend /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "backend.dll"]
