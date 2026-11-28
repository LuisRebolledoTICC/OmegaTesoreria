using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAjustesDeudaSinCaja : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AjustesDeuda",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AsignacionActividadDeudaId = table.Column<int>(type: "integer", nullable: false),
                    ActividadDeudaId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    Importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TipoAjuste = table.Column<string>(type: "text", nullable: false),
                    Motivo = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    FechaAjuste = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RegistradoPor = table.Column<string>(type: "text", nullable: false),
                    FechaReversion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RevertidoPor = table.Column<string>(type: "text", nullable: true),
                    MotivoReversion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AjustesDeuda", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AjustesDeuda_ActividadesDeuda_ActividadDeudaId",
                        column: x => x.ActividadDeudaId,
                        principalTable: "ActividadesDeuda",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AjustesDeuda_AsignacionesActividadDeuda_AsignacionActividad~",
                        column: x => x.AsignacionActividadDeudaId,
                        principalTable: "AsignacionesActividadDeuda",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AjustesDeuda_Users_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AjustesDeuda_ActividadDeudaId",
                table: "AjustesDeuda",
                column: "ActividadDeudaId");

            migrationBuilder.CreateIndex(
                name: "IX_AjustesDeuda_AsignacionActividadDeudaId",
                table: "AjustesDeuda",
                column: "AsignacionActividadDeudaId");

            migrationBuilder.CreateIndex(
                name: "IX_AjustesDeuda_Estado",
                table: "AjustesDeuda",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_AjustesDeuda_TipoAjuste",
                table: "AjustesDeuda",
                column: "TipoAjuste");

            migrationBuilder.CreateIndex(
                name: "IX_AjustesDeuda_UsuarioId",
                table: "AjustesDeuda",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AjustesDeuda");
        }
    }
}
