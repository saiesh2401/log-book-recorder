using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Data.src.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PdfTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CollegeName = table.Column<string>(type: "TEXT", nullable: true),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    OriginalFileName = table.Column<string>(type: "TEXT", nullable: false),
                    StoredPath = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PdfTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PdfDrafts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TemplateId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    Version = table.Column<int>(type: "INTEGER", nullable: false),
                    FormDataJson = table.Column<string>(type: "TEXT", nullable: false),
                    DrawingImagePath = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false, defaultValue: "Draft"),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PdfDrafts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PdfDrafts_PdfTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "PdfTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PdfDrafts_TemplateId",
                table: "PdfDrafts",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_PdfDrafts_UserId_TemplateId",
                table: "PdfDrafts",
                columns: new[] { "UserId", "TemplateId" });

            migrationBuilder.CreateIndex(
                name: "IX_PdfDrafts_UserId_TemplateId_Version",
                table: "PdfDrafts",
                columns: new[] { "UserId", "TemplateId", "Version" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PdfDrafts");

            migrationBuilder.DropTable(
                name: "PdfTemplates");
        }
    }
}
