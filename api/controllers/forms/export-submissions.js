module.exports = {


  friendlyName: 'Export submissions',


  description: 'Esporta le submissions di un form in formato Excel (protetto con JWT)',


  inputs: {
    startDate: {
      type: 'string',
      description: 'Data inizio filtro (ISO format)'
    },
    endDate: {
      type: 'string',
      description: 'Data fine filtro (ISO format)'
    },
    ipAddress: {
      type: 'string',
      description: 'Filtra per IP address'
    }
  },


  exits: {
    success: {
      description: 'File Excel generato con successo'
    },
    notFound: {
      description: 'Form non trovato',
      responseType: 'notFound'
    }
  },


  fn: async function (inputs, exits) {
    const formId = this.req.param('id');
    const ExcelJS = require('exceljs');

    if (!formId) {
      return this.res.ApiResponse({
        errType: 'BAD_REQUEST',
        errMsg: 'formId is required'
      });
    }

    try {
      // Prepara filtri
      const filters = {};
      if (inputs.startDate) {
        filters.startDate = inputs.startDate;
      }
      if (inputs.endDate) {
        filters.endDate = inputs.endDate;
      }
      if (inputs.ipAddress) {
        filters.ipAddress = inputs.ipAddress;
      }

      // Recupera i dati per export
      const result = await sails.helpers.formDb.with({
        formId: formId,
        action: 'export',
        data: filters
      }).intercept('notFound', () => {
        return exits.notFound({ error: 'Form not found' });
      });

      const { data: exportData, formDefinition } = result;

      // Crea il workbook Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Submissions');

      // Metadata
      workbook.creator = 'ASP Messina - Forms System';
      workbook.created = new Date();
      workbook.modified = new Date();

      // Aggiungi intestazioni
      worksheet.columns = exportData.headers.map((header, index) => ({
        header: header,
        key: `col${index}`,
        width: header.length > 20 ? 30 : 20
      }));

      // Stile intestazione
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1976D2' }
      };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // Aggiungi righe
      exportData.rows.forEach(row => {
        const rowData = {};
        row.forEach((cell, index) => {
          rowData[`col${index}`] = cell;
        });
        worksheet.addRow(rowData);
      });

      // Aggiungi bordi
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Freeze first row
      worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
      ];

      // Log l'export
      const logData = {
        level: 'info',
        tag: 'FORMS_ADMIN',
        message: `Export submissions for form ${formId}`,
        action: `export_submissions_${formId}`,
        ipAddress: this.req.ip,
        context: {
          formId: formId,
          totalRows: exportData.rows.length
        }
      };

      // Add user only if authenticated
      if (this.req.user && this.req.user.id) {
        logData.user = this.req.user.id;
      }

      await sails.helpers.log.with(logData);

      // Genera filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${formDefinition.id}_submissions_${timestamp}.xlsx`;

      // Imposta headers per download
      this.res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      this.res.set('Content-Disposition', `attachment; filename="${filename}"`);

      // Scrivi il file direttamente nella response
      await workbook.xlsx.write(this.res);

      return exits.success();

    } catch (err) {
      sails.log.error('Error exporting submissions:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error exporting submissions'
      });
    }
  }


};
