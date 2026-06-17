import type { Metadata } from 'next'

import {
  LegalDocument,
  LI,
  P,
  Pending,
  Section,
  Strong,
  UL,
} from '../_components/LegalDocument'

export const metadata: Metadata = {
  title: 'Termos de Uso · TPC Performance',
}

export default function TermosPage() {
  return (
    <LegalDocument
      title="Termos de Uso"
      version="1.0"
      effectiveDate="22/05/2026"
      lastUpdated="22/05/2026"
    >
      <Section num="1" title="Sobre estes Termos">
        <P>
          Ao criar uma conta no aplicativo <Strong>TPC Painel</Strong> e usar
          os serviços oferecidos pela TPC Performance, você declara que leu,
          entendeu e concorda integralmente com estes Termos de Uso e com a
          Política de Privacidade. Caso não concorde, não utilize o serviço.
        </P>
      </Section>

      <Section num="2" title="Quem somos">
        <P>
          TPC Performance, <Pending>razão social TPC-DECISION</Pending>,
          inscrita no CNPJ sob nº <Pending>CNPJ TPC-DECISION</Pending>, com
          sede em <Pending>endereço TPC-DECISION</Pending>, Panambi/RS. Para
          contato: <Pending>email TPC-DECISION</Pending> ou WhatsApp{' '}
          <Pending>telefone TPC-DECISION</Pending>.
        </P>
      </Section>

      <Section num="3" title="O que é o TPC Painel">
        <P>
          O TPC Painel é um aplicativo de carteira pré-paga digital para
          contratação de serviços automotivos de remapeamento de ECU,
          executados pela TPC Performance em dois canais:
        </P>
        <UL>
          <LI>
            <Strong>Presencial</Strong>, na oficina TPC em Panambi/RS, com
            agendamento prévio e execução no local.
          </LI>
          <LI>
            <Strong>Por arquivo</Strong> (file service), com envio remoto do
            arquivo da ECU (.bin, .ori, .frf, .kess ou .fls) via chat dentro
            do aplicativo, sem necessidade de deslocamento.
          </LI>
        </UL>
      </Section>

      <Section num="4" title="Cadastro e conta">
        <P>
          4.1. Para usar o aplicativo, o cliente deve criar uma conta
          informando nome, email e telefone. CPF ou CNPJ e endereço completo
          são opcionais no cadastro inicial mas obrigatórios para emissão de
          nota fiscal.
        </P>
        <P>
          4.2. O cliente é responsável por manter a confidencialidade dos
          seus dados de acesso. Qualquer atividade realizada com a conta é
          de responsabilidade do titular.
        </P>
        <P>
          4.3. O cliente pode cadastrar até 3 carros na garagem, mantendo 1
          ativo por vez. Compatibilidade entre serviço e motorização do
          veículo é verificada automaticamente no app.
        </P>
        <P>
          4.4. A TPC pode recusar ou suspender contas que violem estes
          Termos, mediante notificação prévia.
        </P>
      </Section>

      <Section num="5" title="Sistema de pontos">
        <P>
          5.1. Os serviços do TPC Painel são contratados{' '}
          <Strong>exclusivamente com pontos pré-pagos</Strong>. Não há
          pagamento avulso por serviço dentro do aplicativo.
        </P>
        <P>
          5.2. Os pontos são adquiridos via pacotes ofertados no aplicativo.
          Valores em reais e quantidades de cada pacote são exibidos no
          momento da compra.
        </P>
        <P>5.3. Os pontos têm dois estados:</P>
        <UL>
          <LI>
            <Strong>Disponíveis</Strong>: saldo livre para uso em novos
            serviços.
          </LI>
          <LI>
            <Strong>Reservados</Strong>: pontos comprometidos com pedidos em
            andamento, ainda não consumidos.
          </LI>
        </UL>
        <P>5.4. Regras de reserva por canal:</P>
        <UL>
          <LI>
            <Strong>Presencial</Strong>: pontos ficam reservados por até 24
            horas aguardando confirmação da TPC. Caso não confirmados,
            retornam automaticamente ao saldo disponível.
          </LI>
          <LI>
            <Strong>Por arquivo</Strong>: pontos ficam reservados até o
            cliente aprovar o arquivo modificado entregue pela TPC. Reservas
            inativas por mais de 24 horas podem expirar automaticamente.
          </LI>
        </UL>
        <P>
          5.5. Pontos não têm validade para o cliente. Ao realizar a compra,
          permanecem disponíveis até serem utilizados ou até a conta ser
          excluída.
        </P>
        <P>
          5.6. <Strong>Não há reembolso de pontos consumidos</Strong> em
          serviços finalizados. Pontos reservados podem ser reembolsados ao
          saldo conforme regras de cancelamento (seção 7).
        </P>
      </Section>

      <Section num="6" title="Compra de pacotes de pontos">
        <P>
          6.1. Os pagamentos são processados pelo{' '}
          <Strong>Mercado Pago</Strong>, intermediador oficial. Os meios
          aceitos são:
        </P>
        <UL>
          <LI>
            <Strong>Pix</Strong>, com confirmação imediata.
          </LI>
          <LI>
            <Strong>Cartão de crédito</Strong> em até 3 parcelas sem juros
            (TPC absorve a taxa de parcelamento até esse limite).
          </LI>
        </UL>
        <P>
          6.2. Após confirmação do pagamento pelo Mercado Pago via webhook,
          os pontos são creditados automaticamente na conta do cliente em
          segundos.
        </P>
        <P>
          6.3. Para Pix, o QR Code gerado tem validade de 30 minutos. Após
          esse prazo, é necessário gerar um novo código.
        </P>
        <P>
          6.4. Em caso de cobrança indevida, falha no crédito de pontos ou
          dúvida sobre o pagamento, o cliente deve acionar a TPC pelos
          canais informados na seção 16. Acionamentos relacionados ao
          processamento podem exigir intervenção do Mercado Pago.
        </P>
        <P>
          6.5. O cliente pode salvar cartão de crédito para compras futuras
          em 1-click. Os dados do cartão são tokenizados pelo Mercado Pago
          e nunca trafegam ou ficam armazenados nos servidores da TPC.
        </P>
      </Section>

      <Section num="7" title="Serviços presenciais">
        <P>
          7.1. Serviços presenciais são executados na oficina TPC em
          Panambi/RS, mediante agendamento prévio pelo aplicativo.
        </P>
        <P>7.2. Após solicitar um serviço presencial, o cliente:</P>
        <UL>
          <LI>Tem os pontos correspondentes movidos para "reservados".</LI>
          <LI>
            Aguarda confirmação da TPC via WhatsApp em até{' '}
            <Pending>tempo TPC-DECISION</Pending> horas úteis.
          </LI>
          <LI>Leva o veículo até a oficina na data e horário acordados.</LI>
        </UL>
        <P>
          7.3. <Strong>Política de cancelamento</Strong> para serviços
          presenciais:
        </P>
        <UL>
          <LI>
            Com <Strong>mais de 24 horas</Strong> de antecedência: sem
            custo, pontos retornam integralmente ao saldo disponível.
          </LI>
          <LI>
            Entre <Strong>2 e 24 horas</Strong> de antecedência: multa de
            20% dos pontos reservados, restante retorna ao saldo.
          </LI>
          <LI>
            Com <Strong>menos de 2 horas</Strong> de antecedência: requer
            análise manual da TPC, caso a caso.
          </LI>
        </UL>
        <P>
          7.4. Serviços de Stage 3 ou similares que demandam múltiplos dias
          bloqueiam automaticamente o(s) dia(s) seguinte(s) ao agendado, e
          o veículo permanece na oficina pelo período informado.
        </P>
        <P>7.5. O serviço de diagnóstico OBD é sempre gratuito.</P>
      </Section>

      <Section num="8" title="Serviços por arquivo (file service)">
        <P>
          8.1. Permitem ao cliente enviar remotamente o arquivo da ECU do
          veículo para a TPC mapear e devolver modificado pelo chat do
          aplicativo.
        </P>
        <P>8.2. Dois fluxos disponíveis:</P>
        <UL>
          <LI>
            <Strong>Padrão</Strong>: cliente solicita serviço com preço fixo,
            pontos são reservados, envia arquivo, TPC mapeia em até{' '}
            <Pending>tempo TPC-DECISION</Pending> horas e entrega no chat,
            cliente aprova, pontos são debitados definitivamente.
          </LI>
          <LI>
            <Strong>Personalizado</Strong>: cliente envia arquivo com
            descrição do que precisa, TPC analisa e envia orçamento em até
            24 horas, cliente aceita (segue fluxo padrão) ou recusa
            (pedido encerrado, sem custo).
          </LI>
        </UL>
        <P>
          8.3. Arquivos aceitos: <Strong>.bin, .ori, .frf, .kess, .fls</Strong>.
          Tamanho máximo de <Strong>16 MB</Strong> por arquivo.
        </P>
        <P>
          8.4. <Strong>Responsabilidades do cliente</Strong> no fluxo de
          arquivo:
        </P>
        <UL>
          <LI>Fornecer arquivo íntegro e original da ECU do veículo.</LI>
          <LI>
            Informar dados técnicos corretos: modelo de ECU, hardware
            utilizado (KESS V2/V3, MPPS, FLEX, etc.), modo de leitura
            (OBD/Bench/Boot), chassi (VIN) e quilometragem.
          </LI>
          <LI>
            Manter backup do arquivo original antes de qualquer instalação,
            como contingência.
          </LI>
        </UL>
        <P>
          8.5. A TPC entrega o arquivo modificado pelo chat do aplicativo,
          com notificação por email. O cliente pode:
        </P>
        <UL>
          <LI>Aprovar o arquivo: pontos são debitados.</LI>
          <LI>Solicitar revisão com observações específicas.</LI>
          <LI>Recusar dentro do prazo de revisão acordado.</LI>
        </UL>
        <P>
          8.6. <Strong>Arquivos modificados ficam disponíveis para download
          permanente</Strong> no histórico da conta. Caso a conta seja
          excluída, o acesso aos arquivos é encerrado conforme item 11 da
          Política de Privacidade.
        </P>
      </Section>

      <Section num="9" title="Garantias">
        <P>
          9.1. Serviços executados pela TPC têm garantia padrão de{' '}
          <Pending>período TPC-DECISION</Pending> meses, contados a partir
          da entrega.
        </P>
        <P>
          9.2. A garantia cobre defeitos relacionados diretamente ao trabalho
          de remapeamento. <Strong>Não cobre</Strong>:
        </P>
        <UL>
          <LI>
            Danos por uso indevido do veículo após o serviço (uso em pista
            sem preparação adequada, etc.).
          </LI>
          <LI>
            Alteração posterior do arquivo entregue por terceiros ou pelo
            próprio cliente.
          </LI>
          <LI>Hardware diferente do informado no momento do pedido.</LI>
          <LI>
            Danos pré-existentes não relacionados ao remapeamento, mesmo
            que apareçam após o serviço.
          </LI>
          <LI>Combustível inadequado ou abastecimento contaminado.</LI>
          <LI>
            Falhas mecânicas não decorrentes do trabalho da TPC (correia
            estourada, embreagem desgastada, etc.).
          </LI>
        </UL>
        <P>
          9.3. Para acionar garantia, o cliente entra em contato pelo
          WhatsApp ou email da TPC com o número do protocolo do serviço.
        </P>
      </Section>

      <Section num="10" title="Responsabilidades do cliente">
        <P>10.1. O cliente declara estar ciente de que:</P>
        <UL>
          <LI>
            Modificações em ECU veicular podem{' '}
            <Strong>afetar a garantia de fábrica</Strong> do veículo e devem
            ser revertidas antes de eventual revisão em concessionária.
          </LI>
          <LI>
            Modificações podem alterar o consumo, a emissão de poluentes e
            o comportamento dinâmico do veículo, exigindo direção mais
            atenta.
          </LI>
        </UL>
        <P>10.2. O cliente é responsável por:</P>
        <UL>
          <LI>
            Cumprir as leis de trânsito vigentes e usar o veículo modificado
            de forma responsável.
          </LI>
          <LI>
            Fornecer informações verdadeiras sobre o veículo, a ECU e o
            hardware usado.
          </LI>
          <LI>Manter os dados de cadastro atualizados.</LI>
          <LI>Manter segura sua senha de acesso e cartões salvos.</LI>
        </UL>
        <P>10.3. É expressamente proibido:</P>
        <UL>
          <LI>
            Compartilhar, revender ou redistribuir arquivos modificados
            recebidos para terceiros.
          </LI>
          <LI>Revender serviços do TPC Painel sem autorização escrita.</LI>
          <LI>Tentar acessar áreas restritas, APIs internas ou contas alheias.</LI>
          <LI>Usar o serviço para fins ilegais ou em desacordo com a lei.</LI>
        </UL>
      </Section>

      <Section num="11" title="Responsabilidades da TPC">
        <P>11.1. A TPC compromete-se a:</P>
        <UL>
          <LI>Executar os serviços contratados com profissionalismo técnico.</LI>
          <LI>
            Manter sigilo sobre dados técnicos do veículo e arquivos
            enviados.
          </LI>
          <LI>
            Cumprir prazos informados, ressalvados casos de força maior e
            paradas técnicas comunicadas.
          </LI>
          <LI>Atender solicitações de garantia conforme item 9.</LI>
          <LI>
            Manter o aplicativo disponível, ressalvadas manutenções
            programadas, que serão comunicadas com antecedência.
          </LI>
          <LI>
            Atender obrigações da LGPD, conforme detalhado na Política de
            Privacidade.
          </LI>
        </UL>
      </Section>

      <Section num="12" title="Propriedade intelectual">
        <P>
          12.1. O nome <Strong>TPC Performance</Strong>, o logotipo, o
          aplicativo <Strong>TPC Painel</Strong> e todos os elementos
          visuais, textos e funcionalidades são propriedade da TPC e não
          podem ser utilizados, copiados ou reproduzidos sem autorização
          escrita.
        </P>
        <P>
          12.2. Os arquivos modificados entregues ao cliente são de uso
          exclusivo do veículo informado no momento do pedido.
          Compartilhamento, revenda ou redistribuição é proibida e pode
          implicar suspensão da conta e, em casos graves, ações legais
          cabíveis.
        </P>
      </Section>

      <Section num="13" title="Limitação de responsabilidade">
        <P>13.1. A TPC não se responsabiliza por:</P>
        <UL>
          <LI>
            Indisponibilidades do aplicativo causadas por terceiros (Clerk,
            Mercado Pago, Cloudflare, provedor de WhatsApp).
          </LI>
          <LI>
            Perdas decorrentes de uso inadequado do veículo após o
            remapeamento.
          </LI>
          <LI>
            Modificações posteriores no arquivo entregue, feitas pelo cliente
            ou por terceiros.
          </LI>
          <LI>Decisões da concessionária quanto à garantia de fábrica.</LI>
          <LI>
            Atrasos atribuíveis a falhas de conectividade do cliente ou de
            infraestrutura de terceiros.
          </LI>
        </UL>
        <P>
          13.2. A responsabilidade total da TPC, em qualquer caso, limita-se
          ao valor pago pelo cliente nos últimos 12 meses pelos serviços
          objeto da reclamação.
        </P>
      </Section>

      <Section num="14" title="Modificações destes Termos">
        <P>
          14.1. A TPC pode alterar estes Termos a qualquer momento. As
          alterações entram em vigor na data de publicação no aplicativo.
        </P>
        <P>
          14.2. <Strong>Alterações relevantes</Strong> (que afetem direitos
          do cliente, política de cancelamento ou cobrança) serão comunicadas
          por email com no mínimo 30 dias de antecedência.
        </P>
        <P>
          14.3. O uso continuado do aplicativo após o início da vigência dos
          novos termos implica aceitação. Caso discorde, o cliente pode
          solicitar exclusão da conta conforme Política de Privacidade.
        </P>
      </Section>

      <Section num="15" title="Lei aplicável e foro">
        <P>15.1. Estes Termos são regidos pelas leis brasileiras, em especial:</P>
        <UL>
          <LI>Código de Defesa do Consumidor (Lei 8.078/90).</LI>
          <LI>Lei Geral de Proteção de Dados (LGPD, Lei 13.709/18).</LI>
          <LI>Marco Civil da Internet (Lei 12.965/14).</LI>
          <LI>Lei 8.846/94, no que toca à guarda de registros fiscais.</LI>
        </UL>
        <P>
          15.2. Fica eleito o foro da Comarca de Panambi/RS para dirimir
          eventuais controvérsias, sem prejuízo do direito do consumidor
          de optar pelo foro do seu domicílio.
        </P>
      </Section>

      <Section num="16" title="Contato">
        <P>Para dúvidas, sugestões ou reclamações sobre estes Termos:</P>
        <UL>
          <LI>
            <Strong>Email</Strong>: <Pending>email TPC-DECISION</Pending>
          </LI>
          <LI>
            <Strong>WhatsApp</Strong>: <Pending>telefone TPC-DECISION</Pending>
          </LI>
          <LI>
            <Strong>Endereço</Strong>:{' '}
            <Pending>endereço completo TPC-DECISION</Pending>, Panambi/RS
          </LI>
        </UL>
      </Section>
    </LegalDocument>
  )
}
