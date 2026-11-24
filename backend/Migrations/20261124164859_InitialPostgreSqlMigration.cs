using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgreSqlMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Auditoria",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<int>(type: "integer", nullable: true),
                    UsuarioNombre = table.Column<string>(type: "text", nullable: false),
                    Accion = table.Column<string>(type: "text", nullable: false),
                    Entidad = table.Column<string>(type: "text", nullable: false),
                    EntidadId = table.Column<string>(type: "text", nullable: false),
                    FechaHora = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ValoresAnteriores = table.Column<string>(type: "text", nullable: true),
                    ValoresNuevos = table.Column<string>(type: "text", nullable: true),
                    Descripcion = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Auditoria", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Cajas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    Finalidad = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Activa = table.Column<bool>(type: "boolean", nullable: false),
                    SaldoActual = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreadoPor = table.Column<string>(type: "text", nullable: false),
                    UltimoConteoFecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EstadoVerificacion = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cajas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DataProtectionKeys",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FriendlyName = table.Column<string>(type: "text", nullable: true),
                    Xml = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DataProtectionKeys", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Denominaciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Activa = table.Column<bool>(type: "boolean", nullable: false),
                    OrdenVisualizacion = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Denominaciones", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserName = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Rol = table.Column<string>(type: "text", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UltimoAcceso = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Conteos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CajaId = table.Column<int>(type: "integer", nullable: false),
                    CajaNombre = table.Column<string>(type: "text", nullable: false),
                    FechaConteo = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SaldoEsperado = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    SaldoContado = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Diferencia = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioNombre = table.Column<string>(type: "text", nullable: false),
                    Observaciones = table.Column<string>(type: "text", nullable: true),
                    TotalMonedas = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalBilletes = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalBolsas = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DesgloseJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Conteos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Conteos_Cajas_CajaId",
                        column: x => x.CajaId,
                        principalTable: "Cajas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Operaciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TipoOperacion = table.Column<string>(type: "text", nullable: false),
                    CajaOrigenId = table.Column<int>(type: "integer", nullable: true),
                    CajaDestinoId = table.Column<int>(type: "integer", nullable: true),
                    FechaOperacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Concepto = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioNombre = table.Column<string>(type: "text", nullable: false),
                    FechaRegistro = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OperacionRelacionadaId = table.Column<int>(type: "integer", nullable: true),
                    Observaciones = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Operaciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Operaciones_Cajas_CajaDestinoId",
                        column: x => x.CajaDestinoId,
                        principalTable: "Cajas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Operaciones_Cajas_CajaOrigenId",
                        column: x => x.CajaOrigenId,
                        principalTable: "Cajas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TiposBolsas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CajaId = table.Column<int>(type: "integer", nullable: true),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    DenominacionAsociadaId = table.Column<int>(type: "integer", nullable: true),
                    ValorUnitario = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Activa = table.Column<bool>(type: "boolean", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TiposBolsas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TiposBolsas_Cajas_CajaId",
                        column: x => x.CajaId,
                        principalTable: "Cajas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TiposBolsas_Denominaciones_DenominacionAsociadaId",
                        column: x => x.DenominacionAsociadaId,
                        principalTable: "Denominaciones",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CajasEfectivo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CajaId = table.Column<int>(type: "integer", nullable: false),
                    TipoEfectivo = table.Column<string>(type: "text", nullable: false),
                    DenominacionId = table.Column<int>(type: "integer", nullable: true),
                    TipoBolsaId = table.Column<int>(type: "integer", nullable: true),
                    Cantidad = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CajasEfectivo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CajasEfectivo_Cajas_CajaId",
                        column: x => x.CajaId,
                        principalTable: "Cajas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CajasEfectivo_Denominaciones_DenominacionId",
                        column: x => x.DenominacionId,
                        principalTable: "Denominaciones",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CajasEfectivo_TiposBolsas_TipoBolsaId",
                        column: x => x.TipoBolsaId,
                        principalTable: "TiposBolsas",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "DetalleOperaciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OperacionId = table.Column<int>(type: "integer", nullable: false),
                    TipoEfectivo = table.Column<string>(type: "text", nullable: false),
                    DenominacionId = table.Column<int>(type: "integer", nullable: true),
                    TipoBolsaId = table.Column<int>(type: "integer", nullable: true),
                    ValorUnitarioHistorico = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Cantidad = table.Column<int>(type: "integer", nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DetalleOperaciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DetalleOperaciones_Denominaciones_DenominacionId",
                        column: x => x.DenominacionId,
                        principalTable: "Denominaciones",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DetalleOperaciones_Operaciones_OperacionId",
                        column: x => x.OperacionId,
                        principalTable: "Operaciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DetalleOperaciones_TiposBolsas_TipoBolsaId",
                        column: x => x.TipoBolsaId,
                        principalTable: "TiposBolsas",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Auditoria_FechaHora",
                table: "Auditoria",
                column: "FechaHora");

            migrationBuilder.CreateIndex(
                name: "IX_CajasEfectivo_CajaId",
                table: "CajasEfectivo",
                column: "CajaId");

            migrationBuilder.CreateIndex(
                name: "IX_CajasEfectivo_DenominacionId",
                table: "CajasEfectivo",
                column: "DenominacionId");

            migrationBuilder.CreateIndex(
                name: "IX_CajasEfectivo_TipoBolsaId",
                table: "CajasEfectivo",
                column: "TipoBolsaId");

            migrationBuilder.CreateIndex(
                name: "IX_Conteos_CajaId",
                table: "Conteos",
                column: "CajaId");

            migrationBuilder.CreateIndex(
                name: "IX_Conteos_FechaConteo",
                table: "Conteos",
                column: "FechaConteo");

            migrationBuilder.CreateIndex(
                name: "IX_DetalleOperaciones_DenominacionId",
                table: "DetalleOperaciones",
                column: "DenominacionId");

            migrationBuilder.CreateIndex(
                name: "IX_DetalleOperaciones_OperacionId",
                table: "DetalleOperaciones",
                column: "OperacionId");

            migrationBuilder.CreateIndex(
                name: "IX_DetalleOperaciones_TipoBolsaId",
                table: "DetalleOperaciones",
                column: "TipoBolsaId");

            migrationBuilder.CreateIndex(
                name: "IX_Operaciones_CajaDestinoId",
                table: "Operaciones",
                column: "CajaDestinoId");

            migrationBuilder.CreateIndex(
                name: "IX_Operaciones_CajaOrigenId",
                table: "Operaciones",
                column: "CajaOrigenId");

            migrationBuilder.CreateIndex(
                name: "IX_Operaciones_FechaOperacion",
                table: "Operaciones",
                column: "FechaOperacion");

            migrationBuilder.CreateIndex(
                name: "IX_Operaciones_TipoOperacion",
                table: "Operaciones",
                column: "TipoOperacion");

            migrationBuilder.CreateIndex(
                name: "IX_TiposBolsas_CajaId",
                table: "TiposBolsas",
                column: "CajaId");

            migrationBuilder.CreateIndex(
                name: "IX_TiposBolsas_DenominacionAsociadaId",
                table: "TiposBolsas",
                column: "DenominacionAsociadaId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_UserName",
                table: "Users",
                column: "UserName",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Auditoria");

            migrationBuilder.DropTable(
                name: "CajasEfectivo");

            migrationBuilder.DropTable(
                name: "Conteos");

            migrationBuilder.DropTable(
                name: "DataProtectionKeys");

            migrationBuilder.DropTable(
                name: "DetalleOperaciones");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Operaciones");

            migrationBuilder.DropTable(
                name: "TiposBolsas");

            migrationBuilder.DropTable(
                name: "Cajas");

            migrationBuilder.DropTable(
                name: "Denominaciones");
        }
    }
}
