import type { Metadata } from 'next'

import {
  LegalDocument,
  LI,
  P,
  Pending,
  Section,
  Strong,
  Table,
  UL,
} from '../_components/LegalDocument'

export const metadata: Metadata = {
  title: 'Política de Privacidade · TPC Performance',
}

export default function PrivacidadePage() {
  return (
    <LegalDocument
      title="Política de Privacidade"
      version="1.0"
      effectiveDate="22/05/2026"
      lastUpdated="22/05/2026"
    >
      <Section num="1" title="Sobre esta Política">
        <P>
          Esta Política descreve como a TPC Performance coleta, usa, armazena
          e protege os dados pessoais dos clientes do aplicativo{' '}
          <Strong>TPC Painel</Strong>, em conformidade com a Lei Geral de
          Proteção de Dados (Lei 13.709/18, LGPD), o Marco Civil da Internet
          (Lei 12.965/14) e o Código de Defesa do Consumidor.
        </P>
      </Section>

      <Section num="2" title="Quem é o controlador">
        <P>
          A TPC Performance, <Pending>razão social TPC-DECISION</Pending>,
          CNPJ <Pending>CNPJ TPC-DECISION</Pending>, com sede em{' '}
          <Pending>endereço TPC-DECISION</Pending>, Panambi/RS, é a
          controladora dos dados pessoais tratados nesta plataforma e
          responde pelas decisões sobre seu tratamento.
        </P>
      </Section>

      <Section num="3" title="Quais dados coletamos">
        <P>
          <Strong>3.1. Dados fornecidos diretamente por você</Strong>
        </P>
        <UL>
          <LI>
            <Strong>Cadastro</Strong>: nome completo, email, telefone e, se
            quiser, foto de avatar.
          </LI>
          <LI>
            <Strong>Dados fiscais</Strong>: CPF ou CNPJ, endereço completo
            (CEP, logradouro, número, complemento, bairro, cidade, UF) para
            emissão de nota fiscal.
          </LI>
          <LI>
            <Strong>Veículos</Strong>: marca, modelo, ano, placa,
            motorização, cor.
          </LI>
          <LI>
            <Strong>Dados técnicos do veículo</Strong> (apenas em pedidos de
            file service): modelo da ECU, hardware utilizado, modo de
            leitura (OBD/Bench/Boot), chassi (VIN), quilometragem.
          </LI>
          <LI>
            <Strong>Pagamento</Strong>: dados de cartão de crédito são
            processados <Strong>exclusivamente pelo Mercado Pago</Strong> e
            tokenizados — a TPC nunca recebe nem armazena o número completo
            do cartão ou o CVV.
          </LI>
          <LI>
            <Strong>Conteúdo do chat</Strong> com a TPC nos pedidos de file
            service.
          </LI>
          <LI>
            <Strong>Arquivos enviados</Strong> (.bin, .ori, .frf, .kess,
            .fls) contendo software da sua ECU.
          </LI>
        </UL>
        <P>
          <Strong>3.2. Dados gerados pelo uso da plataforma</Strong>
        </P>
        <UL>
          <LI>Histórico de pedidos e movimentações de pontos.</LI>
          <LI>Histórico de compras de pacotes e pagamentos efetuados.</LI>
          <LI>Preferências de notificação e consentimentos.</LI>
          <LI>Notificações enviadas (data, hora, status de leitura).</LI>
          <LI>
            Logs de acesso (data, hora, IP, agente do navegador) para
            segurança.
          </LI>
        </UL>
        <P>
          <Strong>3.3. Dados de terceiros integrados</Strong>
        </P>
        <UL>
          <LI>
            Do provedor de autenticação Clerk: identificador único do
            usuário, status de verificação de email/telefone, sessões ativas,
            fatores de autenticação configurados (2FA, etc.).
          </LI>
        </UL>
      </Section>

      <Section num="4" title="Para que usamos seus dados">
        <P>
          Cada uso é embasado em uma das bases legais previstas pela LGPD
          (art. 7):
        </P>
        <Table
          headers={['Finalidade', 'Dados usados', 'Base legal (LGPD)']}
          rows={[
            [
              'Permitir acesso e uso do app',
              'Cadastro, autenticação, sessão',
              'Execução de contrato',
            ],
            [
              'Processar pagamentos',
              'Dados fiscais e de cartão (via Mercado Pago)',
              'Execução de contrato',
            ],
            [
              'Executar serviços contratados (presencial e por arquivo)',
              'Veículo, dados técnicos, arquivos enviados',
              'Execução de contrato',
            ],
            [
              'Comunicação transacional (pedido criado, pagamento aprovado, arquivo entregue)',
              'Email, telefone, push',
              'Execução de contrato',
            ],
            [
              'Comunicação de marketing (novidades, promoções, divulgação de catálogo)',
              'Email, telefone',
              'Consentimento (opt-in)',
            ],
            [
              'Atender obrigações fiscais (NF, escrituração)',
              'CPF/CNPJ, endereço, valores transacionados',
              'Obrigação legal (Lei 8.846/94)',
            ],
            [
              'Segurança da conta e prevenção de fraude',
              'Logs de acesso, dados de sessão',
              'Legítimo interesse',
            ],
            [
              'Atender direitos do titular',
              'Todos os dados pessoais',
              'Cumprimento de obrigação legal',
            ],
          ]}
        />
      </Section>

      <Section num="5" title="Com quem compartilhamos seus dados">
        <P>
          A TPC compartilha estritamente o necessário, com os seguintes
          processadores e parceiros:
        </P>
        <P>
          <Strong>5.1. Clerk (clerk.com)</Strong>
        </P>
        <P>
          Provedor de autenticação e gerenciamento de identidade. Processa
          email, nome, foto, fatores de autenticação. Sediado nos Estados
          Unidos com infraestrutura distribuída. Certificado SOC 2 Type II.
        </P>
        <P>
          <Strong>5.2. Mercado Pago (mercadopago.com.br)</Strong>
        </P>
        <P>
          Processador de pagamentos. Recebe dados fiscais e de cartão para
          execução das cobranças. Empresa brasileira sujeita à LGPD.
        </P>
        <P>
          <Strong>5.3. Resend (resend.com)</Strong>
        </P>
        <P>
          Disparo de emails transacionais e de marketing. Recebe email e
          nome do destinatário. Sediada nos Estados Unidos.
        </P>
        <P>
          <Strong>5.4. Cloudflare R2 (cloudflare.com)</Strong>
        </P>
        <P>
          Armazenamento de arquivos (.bin, .ori, notas fiscais em PDF,
          comprovantes). Operação global, criptografia em trânsito e em
          repouso.
        </P>
        <P>
          <Strong>5.5. WhatsApp Business API</Strong>
        </P>
        <P>
          Envio de notificações via WhatsApp quando o cliente opta por
          receber esse canal. Sujeito à política de privacidade da Meta.
        </P>
        <P>
          <Strong>5.6. Provedor de infraestrutura</Strong> (PostgreSQL,
          Redis): <Pending>provedor TPC-DECISION</Pending>. Banco de dados
          principal e cache.
        </P>
        <P>
          <Strong>5.7. Autoridades governamentais</Strong>
        </P>
        <P>
          Quando exigido por lei, ordem judicial ou requisição válida de
          autoridade competente.
        </P>
        <P>
          A TPC <Strong>não vende, aluga ou troca</Strong> dados pessoais
          com terceiros para fins comerciais.
        </P>
      </Section>

      <Section num="6" title="Transferência internacional de dados">
        <P>
          Alguns processadores listados (Clerk, Resend, Cloudflare) estão
          sediados fora do Brasil. Essas transferências são protegidas por
          contratos que asseguram nível adequado de proteção, conforme LGPD
          art. 33. Você concorda expressamente com essa transferência ao
          utilizar o aplicativo.
        </P>
      </Section>

      <Section num="7" title="Por quanto tempo guardamos seus dados">
        <Table
          headers={['Tipo de dado', 'Tempo de retenção']}
          rows={[
            [
              'Dados de cadastro (nome, email, telefone, CPF, endereço)',
              'Enquanto a conta estiver ativa. Após pedido de exclusão, 30 dias de carência seguidos de anonimização',
            ],
            [
              'Transações financeiras e compras de pacotes',
              '5 anos após a operação (Lei 8.846/94), em formato anonimizado se o cliente excluiu a conta',
            ],
            ['Notas fiscais emitidas', '5 a 10 anos conforme legislação fiscal'],
            [
              'Arquivos modificados (.bin)',
              'Enquanto a conta estiver ativa, para download permanente; excluídos quando a conta é excluída',
            ],
            [
              'Mensagens do chat com a TPC',
              'Enquanto a conta estiver ativa; excluídas na exclusão da conta',
            ],
            ['Logs de segurança e acesso', '12 meses'],
            [
              'Cookies de sessão',
              'Conforme política do Clerk (geralmente até logout ou expiração da sessão)',
            ],
          ]}
        />
        <P>
          Após o término do prazo, os dados pessoais identificáveis são
          anonimizados (dados ficam estatísticos, sem ligação com a pessoa)
          ou excluídos.
        </P>
      </Section>

      <Section num="8" title="Seus direitos (LGPD art. 18)">
        <P>
          Como titular dos dados, você tem os seguintes direitos garantidos:
        </P>
        <P>
          <Strong>8.1. Acesso e portabilidade</Strong>
        </P>
        <P>
          Solicitar uma cópia completa dos seus dados em formato JSON em{' '}
          <Strong>Perfil → Privacidade → Solicitar minhas informações</Strong>.
          Você escolhe o que incluir (transações, pedidos, arquivos,
          mensagens). O pacote é gerado e disponibilizado por email em até
          24 horas, com link válido por 7 dias.
        </P>
        <P>
          <Strong>8.2. Correção</Strong>
        </P>
        <P>
          Atualizar dados desatualizados ou incorretos diretamente em{' '}
          <Strong>Perfil → Dados pessoais</Strong>.
        </P>
        <P>
          <Strong>8.3. Exclusão (direito ao esquecimento)</Strong>
        </P>
        <P>
          Solicitar exclusão da conta em{' '}
          <Strong>Perfil → Privacidade → Excluir minha conta</Strong>. A
          exclusão tem <Strong>carência de 30 dias</Strong>, cancelável
          durante esse período. Após o prazo, dados pessoais identificáveis
          são anonimizados. Transações são mantidas anonimamente por
          exigência fiscal.
        </P>
        <P>
          <Strong>8.4. Revogação de consentimento</Strong>
        </P>
        <P>
          Desligar comunicação de marketing ou transacional canal a canal
          em <Strong>Perfil → Privacidade → Gerenciar consentimentos</Strong>.
          Marketing é <Strong>opt-in</Strong> (default desligado);
          transacional é default ligado, mas você pode desligar.
        </P>
        <P>
          <Strong>8.5. Informação sobre compartilhamento</Strong>
        </P>
        <P>
          Solicitar informações sobre entidades com as quais a TPC
          compartilhou seus dados, pelos canais de contato (seção 12).
        </P>
        <P>
          <Strong>8.6. Oposição e revisão</Strong>
        </P>
        <P>
          Opor-se a tratamento que considere inadequado ou desnecessário, e
          solicitar revisão de decisões automatizadas que afetem seus
          interesses.
        </P>
        <P>
          Para exercer qualquer direito, use as funcionalidades do app ou
          entre em contato pelos canais informados na seção 12.
        </P>
      </Section>

      <Section num="9" title="Cookies e tecnologias similares">
        <P>A TPC utiliza apenas cookies estritamente necessários para:</P>
        <UL>
          <LI>Manter sua sessão de login ativa (gerenciados pelo Clerk).</LI>
          <LI>Lembrar preferências básicas do aplicativo.</LI>
        </UL>
        <P>
          <Strong>Não utilizamos</Strong> cookies de rastreamento publicitário,
          fingerprinting ou compartilhamento com redes sociais.
        </P>
      </Section>

      <Section num="10" title="Segurança">
        <P>
          A TPC adota medidas técnicas e organizacionais para proteger os
          dados:
        </P>
        <UL>
          <LI>Senhas armazenadas com hash criptográfico (Clerk).</LI>
          <LI>Comunicação <Strong>HTTPS/TLS</Strong> em todas as conexões.</LI>
          <LI>
            Tokens de pagamento (Mercado Pago) em vez de números de cartão.
          </LI>
          <LI>Verificação HMAC nos webhooks de pagamento.</LI>
          <LI>Controle de acesso baseado em função (RBAC) no backend.</LI>
          <LI>
            Re-autenticação por senha em ações destrutivas (exclusão de conta).
          </LI>
          <LI>
            Suporte a autenticação em 2 fatores (2FA), recomendado para
            todos os usuários.
          </LI>
          <LI>Logs de auditoria para operações críticas.</LI>
          <LI>Backup periódico do banco de dados.</LI>
        </UL>
        <P>
          Apesar das medidas, nenhum sistema é 100% imune. Em caso de
          incidente de segurança envolvendo seus dados, a TPC comunicará
          você e a Autoridade Nacional de Proteção de Dados (ANPD) conforme
          previsto na LGPD art. 48.
        </P>
      </Section>

      <Section num="11" title="Crianças e adolescentes">
        <P>
          O TPC Painel não é destinado a menores de 18 anos. Não coletamos
          intencionalmente dados de menores. Caso identifiquemos tal coleta,
          os dados são removidos imediatamente. Se você é responsável legal
          e identificou que um menor sob sua tutela criou conta, entre em
          contato pelos canais da seção 12.
        </P>
      </Section>

      <Section num="12" title="Encarregado de Dados (DPO) e contato">
        <P>Para questões relacionadas a esta Política de Privacidade:</P>
        <UL>
          <LI>
            <Strong>Encarregado de Dados (DPO)</Strong>:{' '}
            <Pending>nome TPC-DECISION</Pending>
          </LI>
          <LI>
            <Strong>Email</Strong>: <Pending>email DPO TPC-DECISION</Pending>
          </LI>
          <LI>
            <Strong>WhatsApp</Strong>: <Pending>telefone TPC-DECISION</Pending>
          </LI>
        </UL>
        <P>
          Caso considere que seus direitos não foram atendidos, você pode
          reclamar à Autoridade Nacional de Proteção de Dados (ANPD):{' '}
          <Strong>gov.br/anpd</Strong>.
        </P>
      </Section>

      <Section num="13" title="Alterações nesta Política">
        <P>
          Esta Política pode ser atualizada periodicamente. Alterações
          significativas (mudanças nas finalidades de tratamento ou no
          compartilhamento de dados) serão comunicadas por email aos
          clientes ativos com no mínimo 30 dias de antecedência.
        </P>
        <P>
          A versão sempre vigente está disponível em{' '}
          <Strong>Perfil → Ajuda & Legal → Política de Privacidade</Strong>.
          O histórico de versões pode ser solicitado pelos canais de contato.
        </P>
      </Section>

      <Section num="14" title="Aceitação">
        <P>
          Ao usar o TPC Painel, você confirma que leu e concorda com esta
          Política de Privacidade.
        </P>
      </Section>
    </LegalDocument>
  )
}
