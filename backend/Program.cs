using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.Services;

var builder = WebApplication.CreateBuilder(args);

if (args.Contains("--test-deudas"))
{
    var code = await OmegaTesoreria.Api.Tests.DeudasEventosTests.RunAllTestsAsync();
    Environment.Exit(code);
}

// Soporte para despliegue en web pública (Render, Railway, Fly.io, etc.)
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// 1. Configuración de Base de Datos (PostgreSQL en Producción / SQLite en Local)
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var defaultConn = builder.Configuration.GetConnectionString("DefaultConnection");

string? postgresConnString = null;

// Solo tratar como PostgreSQL si viene en DATABASE_URL o si contiene keywords de postgres / Host=
var candidateConn = !string.IsNullOrEmpty(databaseUrl) ? databaseUrl : defaultConn;

if (!string.IsNullOrEmpty(candidateConn) &&
    (candidateConn.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
     candidateConn.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) ||
     candidateConn.Contains("Host=", StringComparison.OrdinalIgnoreCase) ||
     candidateConn.Contains("Server=", StringComparison.OrdinalIgnoreCase)))
{
    if (candidateConn.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        candidateConn.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        // Parsear URL de estilo postgres://user:pass@host:port/database común en Neon y Render
        var uri = new Uri(candidateConn);
        var userInfo = uri.UserInfo.Split(':');
        var npgsqlBuilder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Username = userInfo[0],
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "",
            Database = uri.AbsolutePath.TrimStart('/'),
            SslMode = SslMode.Require,
            Pooling = true
        };
        postgresConnString = npgsqlBuilder.ToString();
    }
    else
    {
        postgresConnString = candidateConn;
    }
}

if (!string.IsNullOrEmpty(postgresConnString))
{
    Console.WriteLine("[Database] Configurando proveedor PostgreSQL (Neon Cloud)...");
    builder.Services.AddDbContext<AppDbContext>(options =>
    {
        options.UseNpgsql(postgresConnString);
    });

    // En producción con PostgreSQL, persistir las claves de Data Protection en la base de datos
    builder.Services.AddDataProtection()
        .SetApplicationName("OmegaTesoreria")
        .PersistKeysToDbContext<AppDbContext>();
}
else
{
    Console.WriteLine("[Database] No se detectó DATABASE_URL. Usando SQLite local...");
    var customDbDir = Environment.GetEnvironmentVariable("DATABASE_DIR");
    var dbDirectory = !string.IsNullOrEmpty(customDbDir)
        ? Path.GetFullPath(customDbDir)
        : Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "../database"));

    if (!Directory.Exists(dbDirectory)) Directory.CreateDirectory(dbDirectory);

    var keysDirectory = Path.Combine(dbDirectory, "keys");
    if (!Directory.Exists(keysDirectory)) Directory.CreateDirectory(keysDirectory);

    var dbPath = Path.Combine(dbDirectory, "tesoreria.db");
    var sqliteConnString = $"Data Source={dbPath}";

    builder.Services.AddDbContext<AppDbContext>(options =>
    {
        options.UseSqlite(sqliteConnString);
    });

    builder.Services.AddDataProtection()
        .SetApplicationName("OmegaTesoreria")
        .PersistKeysToFileSystem(new DirectoryInfo(keysDirectory));
}

// 2. Dependency Injection
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITesoreriaService, TesoreriaService>();
builder.Services.AddScoped<IVentasService, VentasService>();
builder.Services.AddScoped<IPresupuestosService, PresupuestosService>();
builder.Services.AddScoped<IDeudasEventosService, DeudasEventosService>();

// 3. JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? Environment.GetEnvironmentVariable("Jwt__Key")
    ?? "OmegaSecretKeyForTreasuryManagementApplicationLocalSecure2026!";

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? Environment.GetEnvironmentVariable("Jwt__Issuer")
    ?? "OmegaTesoreria";

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? Environment.GetEnvironmentVariable("Jwt__Audience")
    ?? "OmegaTesoreriaClients";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// 4. CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalAndLAN", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders("Content-Disposition");
    });
});

// 5. Controllers y JSON options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddOpenApi();

var app = builder.Build();

// 6. Migraciones automáticas e inicialización de datos
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbInitializer.InitializeAsync(context);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("AllowLocalAndLAN");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
