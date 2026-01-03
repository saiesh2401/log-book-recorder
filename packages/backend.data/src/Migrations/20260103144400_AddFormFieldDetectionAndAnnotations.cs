using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Data.src.Migrations
{
    /// <inheritdoc />
    public partial class AddFormFieldDetectionAndAnnotations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasFormFields",
                table: "PdfTemplates",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AnnotationsJson",
                table: "PdfDrafts",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasFormFields",
                table: "PdfTemplates");

            migrationBuilder.DropColumn(
                name: "AnnotationsJson",
                table: "PdfDrafts");
        }
    }
}
