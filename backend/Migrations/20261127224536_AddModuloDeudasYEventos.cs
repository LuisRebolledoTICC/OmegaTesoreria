using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddModuloDeudasYEventos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ActividadesDeuda",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FechaActividad = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: true),
                    Activa = table.Column<bool>(type: "boolean", nullable: false),
                    CreadoPor = table.Column<string>(type: "text", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModificadoPor = table.Column<string>(type: "text", nullable: true),
                    FechaModificacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActividadesDeuda", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EventosOmega",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    FechaHora = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Ubicacion = table.Column<string>(type: "text", nullable: true),
                    Descripcion = table.Column<string>(type: "text", nullable: true),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    CreadoPor = table.Column<string>(type: "text", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModificadoPor = table.Column<string>(type: "text", nullable: true),
                    FechaModificacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CanceladoPor = table.Column<string>(type: "text", nullable: true),
                    FechaCancelacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MotivoCancelacion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventosOmega", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AsignacionesActividadDeuda",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ActividadDeudaId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    FormaPago = table.Column<string>(type: "text", nullable: true),
                    CajaId = table.Column<int>(type: "integer", nullable: true),
                    OperacionTesoreriaId = table.Column<int>(type: "integer", nullable: true),
                    FechaPago = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RegistradoPagoPor = table.Column<string>(type: "text", nullable: true),
                    FechaAsignacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UltimaActualizacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActualizadoPor = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AsignacionesActividadDeuda", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AsignacionesActividadDeuda_ActividadesDeuda_ActividadDeudaId",
                        column: x => x.ActividadDeudaId,
                        principalTable: "ActividadesDeuda",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AsignacionesActividadDeuda_Cajas_CajaId",
                        column: x => x.CajaId,
                        principalTable: "Cajas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_AsignacionesActividadDeuda_Operaciones_OperacionTesoreriaId",
                        column: x => x.OperacionTesoreriaId,
                        principalTable: "Operaciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_AsignacionesActividadDeuda_Users_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HistorialPagosDeuda",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AsignacionActividadDeudaId = table.Column<int>(type: "integer", nullable: false),
                    ActividadDeudaId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    Importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FormaPago = table.Column<string>(type: "text", nullable: false),
                    CajaId = table.Column<int>(type: "integer", nullable: false),
                    CajaNombre = table.Column<string>(type: "text", nullable: false),
                    OperacionTesoreriaId = table.Column<int>(type: "integer", nullable: false),
                    OperacionReversaId = table.Column<int>(type: "integer", nullable: true),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    FechaPago = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RegistradoPor = table.Column<string>(type: "text", nullable: false),
                    FechaReversion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RevertidoPor = table.Column<string>(type: "text", nullable: true),
                    MotivoReversion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HistorialPagosDeuda", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HistorialPagosDeuda_ActividadesDeuda_ActividadDeudaId",
                        column: x => x.ActividadDeudaId,
                        principalTable: "ActividadesDeuda",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HistorialPagosDeuda_AsignacionesActividadDeuda_AsignacionAc~",
                        column: x => x.AsignacionActividadDeudaId,
                        principalTable: "AsignacionesActividadDeuda",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HistorialPagosDeuda_Cajas_CajaId",
                        column: x => x.CajaId,
                        principalTable: "Cajas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HistorialPagosDeuda_Users_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionesActividadDeuda_ActividadDeudaId_UsuarioId",
                table: "AsignacionesActividadDeuda",
                columns: new[] { "ActividadDeudaId", "UsuarioId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionesActividadDeuda_CajaId",
                table: "AsignacionesActividadDeuda",
                column: "CajaId");

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionesActividadDeuda_OperacionTesoreriaId",
                table: "AsignacionesActividadDeuda",
                column: "OperacionTesoreriaId");

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionesActividadDeuda_UsuarioId",
                table: "AsignacionesActividadDeuda",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_EventosOmega_Estado",
                table: "EventosOmega",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_EventosOmega_FechaHora",
                table: "EventosOmega",
                column: "FechaHora");

            migrationBuilder.CreateIndex(
                name: "IX_HistorialPagosDeuda_ActividadDeudaId",
                table: "HistorialPagosDeuda",
                column: "ActividadDeudaId");

            migrationBuilder.CreateIndex(
                name: "IX_HistorialPagosDeuda_AsignacionActividadDeudaId",
                table: "HistorialPagosDeuda",
                column: "AsignacionActividadDeudaId");

            migrationBuilder.CreateIndex(
                name: "IX_HistorialPagosDeuda_CajaId",
                table: "HistorialPagosDeuda",
                column: "CajaId");

            migrationBuilder.CreateIndex(
                name: "IX_HistorialPagosDeuda_UsuarioId",
                table: "HistorialPagosDeuda",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EventosOmega");

            migrationBuilder.DropTable(
                name: "HistorialPagosDeuda");

            migrationBuilder.DropTable(
                name: "AsignacionesActividadDeuda");

            migrationBuilder.DropTable(
                name: "ActividadesDeuda");
        }
    }
}
