const axios = require("axios");
const fs = require("fs");
const path = require("path");
const express = require("express");
const pdfParse = require("pdf-parse"); // Biblioteca para extrair texto do PDF
const app = express();

// Adiciona o middleware para que o corpo da requisição seja interpretado como JSON
app.use(express.json());

app.post("/api", async (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) {
    return res.status(400).send("A URL do arquivo não foi fornecida.");
  }

  try {
    // Fazer download do arquivo
    const response = await axios({
      method: "get",
      url: fileUrl,
      responseType: "stream",
    });

    // Verificar dados da resposta antes de salvar
    console.log("Dados do arquivo baixado:", response.headers);
    console.log("Tipo de conteúdo:", response.headers['content-type']); // Verifica o tipo de conteúdo do arquivo

    // Verificar se o tipo de conteúdo é um PDF
    if (response.headers['content-type'] !== 'application/pdf') {
      return res.status(400).send("O arquivo não é um PDF válido.");
    }

    // Salvar o arquivo temporariamente
    const tempFilePath = path.join(__dirname, "temp", "downloaded_file.pdf");
    const writer = fs.createWriteStream(tempFilePath);

    response.data.pipe(writer);

    writer.on("finish", async () => {
      // Processar o PDF após o download ser concluído
      try {
        const pdfData = await pdfParse(fs.readFileSync(tempFilePath));
        const extractedData = extractIdentificationFields(pdfData.text);
        
        console.log("Dados extraídos:", extractedData);
        
        res.send({
          message: "Arquivo processado com sucesso!",
          data: extractedData,
        });

        fs.unlinkSync(tempFilePath); // Limpar o arquivo temporário
      } catch (error) {
        console.error("Erro ao processar o PDF:", error.message);
        res.status(500).send("Erro ao processar o PDF.");
      }
    });

    writer.on("error", (err) => {
      console.error("Erro ao salvar o arquivo:", err);
      res.status(500).send("Erro ao salvar o arquivo.");
    });
  } catch (error) {
    console.error("Erro ao baixar o arquivo:", error.message);
    res.status(500).send(`Erro ao baixar o arquivo: ${error.message}`);
  }
});

// Função para extrair os campos de Identificação do texto do PDF
function extractIdentificationFields(text) {
  const fields = {
    nome: null,
    cpf: null,
    nomeMae: null,
    dataNascimento: null,
    nacionalidade: null,
    sexo: null,
    estadoCivil: null
  };

  // Expressões regulares ajustadas para evitar capturar conteúdo extra
  const regexNome = /Nome\s+([A-Z\s]+)\nCPF/; // Captura o nome antes de "CPF"
  const regexCpf = /CPF\s+([\d.-]+)/; // Captura CPF com ou sem separadores
  const regexNomeMae = /Nome da Mãe\s+([A-Z\s]+)\n/; // Captura o nome da mãe
  const regexDataNascimento = /Data de Nascimento\s+(\d{2}\/\d{2}\/\d{4})/; // Captura a data de nascimento
  const regexNacionalidade = /Nacionalidade\s+([A-Z]+)(?=\nSexo)/; // Captura apenas a nacionalidade
  const regexSexo = /Sexo\s+(Masculino|Feminino|MASCULINO|FEMININO)/i; // Captura o sexo, ignorando maiúsculas e minúsculas
  const regexEstadoCivil = /Estado Civil\s+([A-Z]+)/i; // Captura o estado civil

  // Aplicação das expressões regulares para extrair os dados
  const nomeMatch = text.match(regexNome);
  if (nomeMatch) fields.nome = nomeMatch[1].trim();

  const cpfMatch = text.match(regexCpf);
  if (cpfMatch) fields.cpf = cpfMatch[1].trim();

  const nomeMaeMatch = text.match(regexNomeMae);
  if (nomeMaeMatch) fields.nomeMae = nomeMaeMatch[1].trim();

  const dataNascimentoMatch = text.match(regexDataNascimento);
  if (dataNascimentoMatch) fields.dataNascimento = dataNascimentoMatch[1].trim();

  const nacionalidadeMatch = text.match(regexNacionalidade);
  if (nacionalidadeMatch) fields.nacionalidade = nacionalidadeMatch[1].trim();

  const sexoMatch = text.match(regexSexo);
  if (sexoMatch) fields.sexo = sexoMatch[1].trim();

  const estadoCivilMatch = text.match(regexEstadoCivil);
  if (estadoCivilMatch) fields.estadoCivil = estadoCivilMatch[1].trim();

  return fields;
}



// Definindo a porta e iniciando o servidor
const port = 3000; // Escolha a porta que preferir
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
