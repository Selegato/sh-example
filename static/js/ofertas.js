//seleciona e formata cpf
document.getElementById("cpf").addEventListener("input", function (e) {
  //remove limpa != numero
  var x = e.target.value
    //divide strings em 3 3 3 2 cpf
    .replace(/\D/g, "")
    .match(/(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})/);
  //formata cpf
  e.target.value = !x[2]
    ? x[1]
    : x[1] + "." + x[2] + (x[3] ? "." + x[3] : "") + (x[4] ? "-" + x[4] : "");
});

$(document).ready(function () {
  $("#cpfForm").submit(function (e) {
    e.preventDefault();
    var cpf = $("#cpf").val();

    //envia cpf retorna bandeiras para o #bandeiraSeletor, dados do cliente
    $.ajax({
      url: "/buscar-cadastro-oferta",
      type: "POST",
      data: { cpf: cpf },
      success: function (response) {
        if (response.message == "Customer not found") {
          //esconde janelas previas
          $("#clientInfo").fadeOut();
          $("#divBandeira").fadeOut();
          $("#vitrineCliente").fadeOut();
          $("#ativasCliente").fadeOut();
          alert("Cliente nao encontrado");
        } else {
          $("#clientName").text(response.nome);
          $("#clientEmail").text(response.email);
          $("#clientPhone").text(response.fone);

          var seletor = $("#bandeiraSeletor");
          seletor.empty();
          seletor.append(
            $("<option></option>").val("").text("Selecione uma bandeira")
          );
          //carrega bandeiras no seletor
          response.bandeiras.forEach(function (bandeira) {
            seletor.append($("<option></option>").val(bandeira).text(bandeira));
          });
          //exibe janelas com dados carregados
          $("#clientInfo").fadeIn();
          $("#divBandeira").fadeIn();
        }
      },
      error: function (error) {
        console.log(error);
        alert("Erro ao buscar informações do cliente");
      },
    });
  });

  $("#bandeiraSeletor").change(function () {
    var bandeiraSelecionada = $("#bandeiraSeletor").val();
    $("#vitrineCliente").hide();
    $("#ativasCliente").hide();
    $("#loadingIndicator").show();
    //envia bandeira selecionada, retorna vitrine e ofertas ativas do cliente
    $.ajax({
      url: "/consulta-ofertas",
      type: "POST",
      data: { bandeira: bandeiraSelecionada },
      success: function (response) {
        var vitrine_cliente = response.vitrine_cliente;
        var ofertas_ativas = response.ofertas_ativas;
        var ofertasContainer = $("#ofertasContainer");
        var ativasContainer = $("#ativasContainer");
        ofertasContainer.empty();
        ativasContainer.empty();

        // tabela html de vitrine
        var vitrine = '<table id="vitrineTable" class="table table-bordered">';
        //colunas da tabela
        vitrine +=
          "<thead><tr>" +
          "<th>Codigo Oferta</th>" +
          "<th>EAN</th>" +
          "<th>Produto</th>" +
          "<th>Categoria</th>" +
          "<th>Tipo Oferta</th>" +
          "<th>Preço De</th>" +
          "<th>Preço Por</th>" +
          "<th>Desconto</th>" +
          "<th>Unidade</th>" +
          "<th>Disponível</th>" +
          "<th>Maximo</th>" +
          "<th>Data Início</th>" +
          "<th>Data Fim</th>" +
          "<th>Imagem</th>" +
          "</tr></thead>";
        vitrine += "<tbody>";
        //alimenta linhas tabela
        vitrine_cliente.forEach(function (vitrine_cliente) {
          vitrine +=
            "<tr>" +
            "<td>" +
            vitrine_cliente.codigoofertapdv +
            "</td>" +
            "<td>" +
            vitrine_cliente.ean +
            "</td>" +
            "<td>" +
            vitrine_cliente.produto +
            "</td>" +
            "<td>" +
            vitrine_cliente.categoria +
            "</td>" +
            "<td>" +
            vitrine_cliente.tipooferta +
            "</td>" +
            "<td>" +
            vitrine_cliente.precode +
            "</td>" +
            "<td>" +
            vitrine_cliente.precopor +
            "</td>" +
            "<td>" +
            vitrine_cliente.percentualdesc +
            "%</td>" +
            "<td>" +
            vitrine_cliente.unidade +
            "</td>" +
            "<td>" +
            vitrine_cliente.disponivel +
            "</td>" +
            "<td>" +
            vitrine_cliente.maximo +
            "</td>" +
            "<td>" +
            vitrine_cliente.inicio +
            "</td>" +
            "<td>" +
            vitrine_cliente.fim +
            "</td>" +
            '<td><img src="' +
            vitrine_cliente.imagem +
            //formatacao da imagem
            '" alt="Imagem do Produto" style="width:50px;height:auto;"></td>' +
            "</tr>";
        });
        vitrine += "</tbody></table>";
        ofertasContainer.append(vitrine);
        $("#vitrineTable").DataTable();
        //loading on
        $("#vitrineCliente").fadeIn();

        // tabela html ofertas ativas
        var ofertas = '<table id="ofertasTable" class="table table-bordered">';
        //colunas tabela
        ofertas +=
          "<thead><tr>" +
          "<th>Codigo Oferta</th>" +
          "<th>Modalidade</th>" +
          "<th>Preco Por</th>" +
          "<th>% de Desconto</th>" +
          "<th>Medida</th>" +
          "<th>Maximo</th>" +
          "<th>Disponivel</th>" +
          "<th>Inicio</th>" +
          "<th>Fim</th>" +
          "<th>PLU : PRODUTO</th>" +
          "</tr></thead>";
        ofertas += "<tbody>";

        //carrega ofertas e itens da ofertas
        ofertas_ativas.forEach(function (ofertas_ativas) {
          let itensAceitos = "";
          ofertas_ativas.itensaceitos.forEach(function (item) {
            itensAceitos +=
              "<div>" + item.codigo + ": " + item.descricao + "</div>";
          });
          //alimenta linhas tabela
          ofertas +=
            "<tr>" +
            "<td>" +
            ofertas_ativas.codigoofertapdv +
            "</td>" +
            "<td>" +
            ofertas_ativas.modalidade +
            "</td>" +
            "<td>" +
            ofertas_ativas.precocomdesc +
            "</td>" +
            "<td>" +
            ofertas_ativas.percdesc +
            "</td>" +
            "<td>" +
            ofertas_ativas.unmed +
            "</td>" +
            "<td>" +
            ofertas_ativas.quantmax +
            "</td>" +
            "<td>" +
            ofertas_ativas.quantdisp +
            "</td>" +
            "<td>" +
            ofertas_ativas.datainicio +
            "</td>" +
            "<td>" +
            ofertas_ativas.datafinal +
            "</td>" +
            "<td>" +
            itensAceitos +
            "</td>" +
            "</tr>";
        });
        ofertas += "</tbody></table>";
        ativasContainer.append(ofertas);
        $("#ofertasTable").DataTable();
        $("#ativasCliente").fadeIn();
        //loading off
        $("#loadingIndicator").hide();
      },
      error: function (error) {
        console.log(error);
        alert("Erro ao consultar ofertas.");
      },
    });
  });
});
