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

    //envia cpf retorna bandeiras para o #bandeiraSeletor
    $.ajax({
      url: "/buscar-cadastro-beneficio",
      type: "POST",
      data: { cpf: cpf },
      success: function (response) {
        //caso resposta vazia cliente nao foi encontrado.
        if (response == "") {
          //hide campos proximos campos caso cliente nao encontrado.
          $("#divBandeira").fadeOut();
          $("#divCiclos").fadeOut();
          $("#customerInfo").fadeOut();
          $("#divBeneficios").fadeOut();
          alert("Cliente nao encontrado.");
        } else {
          $("#divCiclos").hide();
          $("#customerInfo").hide();
          $("#divBeneficios").hide();
          var seletor = $("#bandeiraSeletor");
          seletor.empty();
          seletor.append(
            $("<option></option>").val("").text("Selecione uma bandeira")
          );
          response.forEach(function (bandeira) {
            seletor.append($("<option></option>").val(bandeira).text(bandeira));
          });
          $("#divBandeira").fadeIn();
        }
      },
      error: function (error) {
        console.log(error);
        alert("Erro ao buscar informações do cliente");
      },
    });
  });
  //envia bandeira selecionada retorna dados do cliente e ciclos
  $("#bandeiraSeletor").change(function () {
    var bandeiraSelecionada = $("#bandeiraSeletor").val();
    //pega texto seletor caso seja igual selecione nao envia requisicao
    var verifica_bandeira_vazia = $("#bandeiraSeletor option:selected").text();
    if (verifica_bandeira_vazia === "Selecione uma bandeira") {
      $("#divCiclos").hide();
      $("#customerInfo").hide();
      $("#divBeneficios").hide();
    } else {
      $.ajax({
        url: "/buscar-ciclos",
        type: "POST",
        data: { bandeira_selecionada: bandeiraSelecionada },
        success: function (response) {
          //carrega dados do cliente
          $("#customerName").text(response.name);
          $("#customerPontos").text(response.pontos);
          $("#customerCategoria").text(response.cat_user);
          var seletor = $("#cicloSeletor");
          seletor.empty();
          seletor.append(
            $("<option></option>").val("").text("Selecione o ciclo")
          );
          response.lista_ciclo.forEach(function (ciclo) {
            seletor.append($("<option></option>").val(ciclo).text(ciclo));
          });
          $("#divCiclos").fadeIn();
          $("#customerInfo").fadeIn();
        },
        error: function (error) {
          console.log(error);
          alert("Erro ao buscar ciclos.");
        },
      });
    }
  });
  //caso alteracao de ciclo seletor chama atualiza beneficios
  $("#cicloSeletor").change(function () {
    atualizarBeneficios();
  });

  //botao de baixa envia id dos beneficios selecionados para baixa
  $("#btnBaixa").click(function () {
    ids_selecionados = []; //reseta ids selecionados previamente
    //adiciona os ids dos beneficios do checkbox
    $(".beneficio-checkbox:checked").each(function () {
      ids_selecionados.push($(this).val());
    });
    //envia ids dos beneficios selecionados, retorno http code
    $.ajax({
      url: "/baixa-beneficio-api",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({ ids: ids_selecionados }),
      //esconde botao de baixa enquanto a baixa e realizada, exibe loading
      beforeSend: function () {
        $("#btnBaixa").fadeOut();
        $("#loadingIndicator").fadeIn();
      },
      success: function (response) {
        //caso resposta seja sucesso
        alert("Beneficios Baixados");
        atualizarBeneficios();
      },
      error: function (error) {
        alert("Erro ao baixar benefícios");
      },
      complete: function () {
        $("#btnBaixa").prop("disabled", false);
        $("#loadingIndicator").fadeOut();
      },
    });
  });
});

//verifica por beneficios selecionados para exibit botao de baixa
function verificarExibicaoBotaoBaixa() {
  if ($(".beneficio-checkbox:checked").length > 0) {
    $("#btnBaixa").fadeIn();
  } else {
    $("#btnBaixa").fadeOut();
  }
}

//adiciona evento a checkbox
$(document).on("change", ".beneficio-checkbox", function () {
  verificarExibicaoBotaoBaixa();
});

//envia ciclo, recebe beneficios cria checkbox de baixa caso ciclo atual
function atualizarBeneficios() {
  var cicloSelecionado = $("#cicloSeletor").val();
  //pega a string selecionada e compara para nao enviar requisicao de busca de "selecione o ciclo"
  var verifica_ciclo_vazio = $("#cicloSeletor option:selected").text();
  if (verifica_ciclo_vazio == "Selecione o ciclo") {
    $("#divBeneficios").hide();
  } else {
    $.ajax({
      url: "/buscar-beneficios",
      type: "POST",
      data: { ciclo_selecionado: cicloSelecionado },
      success: function (response) {
        var beneficiosContainer = $("#beneficiosContainer");
        beneficiosContainer.empty();
        //cria tabela html
        var tabelaBeneficios =
          '<table id="beneficiosTable" class="table table-bordered">';
        //cria colunas colunas da tabela
        tabelaBeneficios +=
          "<thead><tr>" +
          "<th>Selecionar</th>" +
          "<th>Status</th>" +
          "<th>Produto</th>" +
          "<th>Data Ativo</th>" +
          "<th>Data Resgate</th>" +
          "</tr></thead><tbody>";
        //alimenta tabela beneficios
        response.beneficios.forEach(function (beneficio) {
          var checkbox = "";
          //caso ciclo atual checkbox de baixa e criado tambem.
          if (beneficio.status !== "resgatado" && response.ciclo_atual) {
            checkbox =
              "<input type='checkbox' class='beneficio-checkbox' value='" +
              beneficio.idOfertaBeneficio +
              "'>";
          }
          //adiciona dados as linhas
          tabelaBeneficios +=
            "<tr>" +
            "<td>" +
            checkbox +
            "</td>" +
            "<td>" +
            beneficio.status +
            "</td>" +
            "<td>" +
            beneficio.titulo +
            "</td>" +
            "<td>" +
            beneficio.dataAtivo +
            "</td>" +
            "<td>" +
            beneficio.dataResgate +
            "</td>" +
            "</tr>";
        });

        tabelaBeneficios += "</tbody></table>";
        beneficiosContainer.append(tabelaBeneficios);

        //inicializa a dt, destroi anterior
        if ($.fn.DataTable.isDataTable("#beneficiosTable")) {
          $("#beneficiosTable").DataTable().destroy();
        }
        $("#beneficiosTable").DataTable();
        $("#divBeneficios").fadeIn();
      },

      error: function (error) {
        console.log(error);
        alert("Erro ao buscar benefícios.");
      },
    });
  }
}
