import os
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from backend.ofertas import API_Consulta_Cliente_Cognito, API_Consulta_Vitrine_Cliente, API_Consulta_Oferta_PDV
from backend.beneficios import MysqlDb, Api_Baixa_Beneficios
from dotenv import load_dotenv
from datetime import datetime, date


load_dotenv()

app = Flask(__name__)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

#reprocessa dados da vitrine do cliente, retornando lista de dicionarios com todas as ofertas do cliente
def flatten_data_vitrine(data):
    flat_data = []
    for vitrine in data['Vitrine']['Vitrines']:
        for oferta in vitrine['Ofertas']:
            oferta_data = {
                'categoria': vitrine.get('Categoria'),
                'codigoofertapdv': oferta.get('CodigoOfertaPDV'),
                'tipooferta': oferta.get('Nome'),
                'produto': oferta.get('DescricaoProduto'),
                'ean': oferta.get('Ean'),
                'imagem': oferta.get('ImagemProduto'),
                'unidade': oferta['Regras'].get('UnidadeDeMedida'),
                'maximo': oferta['Regras'].get('QuantidadeMaxima'),
                'disponivel': oferta['Regras'].get('QuantidadeDisponivel'),
                'inicio': oferta['Regras'].get('DataInicial'),
                'fim': oferta['Regras'].get('DataFinal'),
                'precode': oferta['Regras'].get('PrecoDe', ''),
                'precopor': oferta['Regras'].get('PrecoPor', ''),
                'percentualdesc': oferta['Regras'].get('PercentualDesconto', '')
            }
            flat_data.append(oferta_data)
    return flat_data

#reprocessa dados ofertas ativas do cliente, retorna lista de dicionarios com ofertas ativas e lista de itens aceitos. 
def flatten_ofertas_ativas(ofertas_ativas):
    flatten_data = []
    for oferta in ofertas_ativas['Result']['Ofertas']:
        modalidade = oferta['Modalidade']
        regras = modalidade['Regras']

        #lista com items aceitos na oferta
        itens_aceitos = []
        for item in oferta['Produto']['Items']:
            itens_aceitos.append({
                'codigo': item.get('CodigoInterno'),
                'descricao': item.get('Descricao')
            })

        # cria dicionarios com dados da oferta e junto com lista de itens aceitos.
        ofertas_temp = {
            'codigoofertapdv': oferta.get('CodigoOfertaPDV'),
            'modalidade': modalidade.get('Nome'),
            'precocomdesc': regras.get('PrecoComDesconto',''),
            'percdesc': regras.get('PercentualDesconto',''),
            'quantmax': regras.get('QuantidadeMaxima'),
            'unmed': regras.get('UnidadeDeMedida'),
            'quantdisp': regras.get('QuantidadeDisponivel'),
            'datainicio': regras.get('DataInicial'),
            'datafinal': regras.get('DataFinal'),
            'itensaceitos': itens_aceitos
        }

        flatten_data.append(ofertas_temp)
    return flatten_data


@app.route('/')
def home():
    return render_template('base.html')


#INICIO BENEFICIO
@app.route('/verifica-beneficio')
def verifica_beneficio():
   return render_template('verifica-beneficio.html')

#REQ AJAX #cpfForm retorna lista bandeiras disponiveis
@app.route('/buscar-cadastro-beneficio', methods=['POST'])
def buscar_cadastro_beneficio():
    #recebe cpf
    cpf = request.form['cpf']
    #consulta bd
    db = MysqlDb()
    customer_data = db.get_user_data(cpf)
    #caso vazio ajax emite  alerta cliente nao encontrado
    if not customer_data:
        return customer_data
    #copia dados para sessao que sao utilizados posteriormente
    session['customer_data'] = customer_data
    session['cpf'] = cpf
    #filtra bandeiras ALTERAR AQUI PARA TER MAIS BANDEIRAS
    filtro_bandeira = ['PREZUNIC','BRETAS','PERINI']
    #gera lista com todas as bandeiras no cadastro do cliente
    bandeiras = []
    bandeiras = [flag.get('enBandeira') for flag in customer_data if flag.get('enBandeira') in filtro_bandeira]
    return bandeiras

# REQ AJAX #bandeiraSeletor retorna dicionario com lista ciclos por bandeira e dados do cliente
@app.route('/buscar-ciclos', methods=['POST'])
def buscar_ciclos():
    bandeira_selecionada = request.form['bandeira_selecionada']
    session['bandeira_selecionada'] = bandeira_selecionada
    #consulta db
    db = MysqlDb()
    ciclos_bandeira = db.get_ciclos(bandeira_selecionada)
    #filtra dados do cliente pela bandeira selecionada
    customer_data = session['customer_data']
    for customer in customer_data:
        if bandeira_selecionada == customer.get('enBandeira'):
            name = customer.get('nmNome')
            pontos = customer.get('pontos')
            cat_user = customer.get('descCategoriaUser')
            break
    #retorna os 4 ultimos ciclos, limit 4 na consulta sql
    lista_ciclo = [
        f"INICIO: {ciclo['dtInicioCiclo'].strftime('%d-%m-%Y')} - FIM: {ciclo['dtFimCiclo'].strftime('%d-%m-%Y')}"
        for ciclo in ciclos_bandeira
    ]
    return {'lista_ciclo': lista_ciclo,
            'name': name,
            'pontos': pontos,
            'cat_user': cat_user}

# REQ AJAX #cicloSeletor retorna dicionario com lista de beneficios e marcador de beneficio atual para habilitar checkbox de baixa
@app.route('/buscar-beneficios', methods=['POST'])
def buscar_beneficios():
    ciclo_selecionado = request.form['ciclo_selecionado']
    #recebe string de ciclo selecionado, divide em partes
    parts = ciclo_selecionado.split(" - ")
    inicio_str = parts[0].replace("INICIO: ", "").strip()
    fim_str = parts[1].replace("FIM: ", "").strip()
    #transforma as strings -> datas
    data_inicio = datetime.strptime(inicio_str, "%d-%m-%Y")
    data_fim = datetime.strptime(fim_str, "%d-%m-%Y")
    
    data_inicio = data_inicio.date()
    data_fim = data_fim.date()
    #data de hoje  e controlador de ciclo atual
    data_now = date.today()
    ciclo_atual = False
    #compara se estamos no ciclo atual
    if data_inicio <= data_now <= data_fim:
        ciclo_atual = True
        
    cpf = session['cpf']
    bandeira_selecionada = session['bandeira_selecionada']
    #consulta beneficios 
    db = MysqlDb()
    beneficios = db.get_beneficios(cpf, bandeira_selecionada, data_inicio, data_fim)
    session['beneficios'] = beneficios
    #retorna dicionario com lista de beneficios e controle ciclo atual.
    return jsonify({'beneficios': beneficios, 
                    'ciclo_atual': ciclo_atual})

# REQ AJAX #btnBaixa recebe o id beneficio do checkbox envia para baixa via api retorna sucesso
@app.route('/baixa-beneficio-api', methods=['POST'])
def baixa_beneficio_api():
    #recebe os ids
    data = request.json
    selected_ids = data.get('ids',[])
    selected_ids = [int(id) for id in selected_ids]
    #recupera beneficios da sessao
    beneficios = session['beneficios']
    selected_beneficios = []
    #seleciona os beneficios com base nos ids
    for beneficio in beneficios:
        if beneficio.get('idOfertaBeneficio') in selected_ids:
            selected_beneficios.append(beneficio)

    bandeira_selecionada = session['bandeira_selecionada']
    cpf = session['cpf']

    #envia baixa para api
    api = Api_Baixa_Beneficios()
    result = api.baixa_beneficio(bandeira=bandeira_selecionada,ticket="123456",cpf=cpf,beneficios=selected_beneficios)
    return result

#END verifica beneficio




#INICIO OFERTA
@app.route('/verifica-oferta')
def verifica_oferta():
    return render_template('verifica-oferta.html')


# REQ AJAX #cpfForm recebe cpf dados do cliente e bandeiras do cadastro
@app.route('/buscar-cadastro-oferta', methods=['POST'])
def buscar_cadastro_oferta():
    cpf = request.form['cpf']
    #consulta via api
    api = API_Consulta_Cliente_Cognito()
    customer_data = api.consulta_cognito(cpf)
    #retorna vazio caso nao cliente nao encontrado, tratado no front
    if customer_data.get('message') == 'Customer not found':
        return customer_data
    customer_data = customer_data['customer']
    subsidiaries = customer_data['subsidiary']
    bandeiras = [subsidiary['subsidiaryName'] for subsidiary in subsidiaries]
    session['subsidiaries'] = subsidiaries
    customer_contact = {
        'nome': customer_data.get('firstName'),
        'email': customer_data.get('email'),
        'fone': customer_data.get('phone'),
        'bandeiras': bandeiras
    }
    return customer_contact


# REQ AJAX #bandeiraSeletor" recebe bandeira selecionada, retorna dicionario vitrine e dicionario ofertas
@app.route('/consulta-ofertas', methods=['POST'])
def buscar_ofertas():
    bandeira_selecionada = request.form['bandeira']
    subsidiaries = session['subsidiaries']
    #filtra subsidiario pela bandeira selecionada
    subsidiary = [subsidiary for subsidiary in subsidiaries if bandeira_selecionada == subsidiary['subsidiaryName']]
    app_id = subsidiary[0]['subsidiaryId']
    crm_user_id = subsidiary[0]['crmUserId']
    #conulta vitrine
    api_vitrine = API_Consulta_Vitrine_Cliente(app_id)
    vitrine_cliente = api_vitrine.consulta_vitrine_cliente(crm_user_id)
    cpf = str(vitrine_cliente['Vitrine']['Cpf'])
    #junta vitrine para uma lista unica de ofertas
    vitrine_cliente = flatten_data_vitrine(vitrine_cliente)
    #consulta oferta pdv
    api_pdv = API_Consulta_Oferta_PDV()
    ofertas_ativas = api_pdv.consulta_oferta_pdv(cpf, bandeira_selecionada)
    #junta ofertas ativas para uma lista unica de ofertas
    ofertas_ativas = flatten_ofertas_ativas(ofertas_ativas)
    return {'vitrine_cliente': vitrine_cliente,
            'ofertas_ativas': ofertas_ativas}
#FIM OFERTA





if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')

