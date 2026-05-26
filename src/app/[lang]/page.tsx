import { getDictionary, type Locale } from "@/dictionaries/getDictionary"
import { HomeClient } from "@/components/home/HomeClient"

interface PageProps {
  params: Promise<{
    lang: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale)

  return <HomeClient dict={dict} locale={lang as Locale} />
}
