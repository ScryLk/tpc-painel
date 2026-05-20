import { redirect } from 'next/navigation'

// Rota mantida como deep link: dashboard shortcut e links externos seguem
// chegando aqui e o modal de adicionar carro abre dentro de /garagem.
export default function AdicionarCarroPage() {
  redirect('/garagem?add=1')
}
