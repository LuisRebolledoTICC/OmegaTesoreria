using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddModuloPresupuestos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PresupuestosArea",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AreaId = table.Column<int>(type: "integer", nullable: false),
                    SaldoDisponible = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalRecibido = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalGastado = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalDevuelto = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAjustes = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FechaActualizacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PresupuestosArea", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PresupuestosArea_Areas_AreaId",
                        column: x => x.AreaId,
                        principalTable: "Areas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MovimientosPresupuesto",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PresupuestoAreaId = table.Column<int>(type: "integer", nullable: false),
                    AreaId = table.Column<int>(type: "integer", nullable: false),
                    TipoMovimiento = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    Importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FechaMovimiento = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Concepto = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: true),
                    CajaId = table.Column<int>(type: "integer", nullable: true),
                    CajaNombre = table.Column<string>(type: "text", nullable: true),
                    OperacionTesoreriaId = table.Column<int>(type: "integer", nullable: true),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioNombre = table.Column<string>(type: "text", nullable: false),
                    FechaRegistro = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EditadoPor = table.Column<string>(type: "text", nullable: true),
                    FechaUltimaEdicion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CanceladoPor = table.Column<string>(type: "text", nullable: true),
                    FechaCancelacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MotivoCancelacion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MovimientosPresupuesto", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MovimientosPresupuesto_Areas_AreaId",
                        column: x => x.AreaId,
                        principalTable: "Areas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MovimientosPresupuesto_Cajas_CajaId",
                        column: x => x.CajaId,
                        principalTable: "Cajas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MovimientosPresupuesto_Operaciones_OperacionTesoreriaId",
                        column: x => x.OperacionTesoreriaId,
                        principalTable: "Operaciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MovimientosPresupuesto_PresupuestosArea_PresupuestoAreaId",
                        column: x => x.PresupuestoAreaId,
                        principalTable: "PresupuestosArea",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PresupuestoEvidencias",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovimientoPresupuestoId = table.Column<int>(type: "integer", nullable: false),
                    NombreArchivo = table.Column<string>(type: "text", nullable: false),
                    ContentType = table.Column<string>(type: "text", nullable: false),
                    DatosBase64 = table.Column<string>(type: "text", nullable: false),
                    FechaSubida = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PresupuestoEvidencias", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PresupuestoEvidencias_MovimientosPresupuesto_MovimientoPres~",
                        column: x => x.MovimientoPresupuestoId,
                        principalTable: "MovimientosPresupuesto",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PresupuestoMovimientosHistorial",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovimientoPresupuestoId = table.Column<int>(type: "integer", nullable: false),
                    Accion = table.Column<string>(type: "text", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioNombre = table.Column<string>(type: "text", nullable: false),
                    FechaCambio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ValoresAnterioresJson = table.Column<string>(type: "text", nullable: true),
                    ValoresNuevosJson = table.Column<string>(type: "text", nullable: true),
                    Detalle = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PresupuestoMovimientosHistorial", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PresupuestoMovimientosHistorial_MovimientosPresupuesto_Movi~",
                        column: x => x.MovimientoPresupuestoId,
                        principalTable: "MovimientosPresupuesto",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosPresupuesto_AreaId",
                table: "MovimientosPresupuesto",
                column: "AreaId");

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosPresupuesto_CajaId",
                table: "MovimientosPresupuesto",
                column: "CajaId");

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosPresupuesto_Estado",
                table: "MovimientosPresupuesto",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosPresupuesto_FechaMovimiento",
                table: "MovimientosPresupuesto",
                column: "FechaMovimiento");

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosPresupuesto_OperacionTesoreriaId",
                table: "MovimientosPresupuesto",
                column: "OperacionTesoreriaId");

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosPresupuesto_PresupuestoAreaId",
                table: "MovimientosPresupuesto",
                column: "PresupuestoAreaId");

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosPresupuesto_TipoMovimiento",
                table: "MovimientosPresupuesto",
                column: "TipoMovimiento");

            migrationBuilder.CreateIndex(
                name: "IX_PresupuestoEvidencias_MovimientoPresupuestoId",
                table: "PresupuestoEvidencias",
                column: "MovimientoPresupuestoId");

            migrationBuilder.CreateIndex(
                name: "IX_PresupuestoMovimientosHistorial_MovimientoPresupuestoId",
                table: "PresupuestoMovimientosHistorial",
                column: "MovimientoPresupuestoId");

            migrationBuilder.CreateIndex(
                name: "IX_PresupuestosArea_AreaId",
                table: "PresupuestosArea",
                column: "AreaId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PresupuestoEvidencias");

            migrationBuilder.DropTable(
                name: "PresupuestoMovimientosHistorial");

            migrationBuilder.DropTable(
                name: "MovimientosPresupuesto");

            migrationBuilder.DropTable(
                name: "PresupuestosArea");
        }
    }
}
