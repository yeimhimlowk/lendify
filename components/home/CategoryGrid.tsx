import { createServerSupabaseClient } from "@/lib/supabase/server"
import { categoryIcons } from "@/lib/constants/categories"
import Link from "next/link"

export default async function CategoryGrid() {
  const supabase = await createServerSupabaseClient()
  
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return (
    <section className="px-4 py-16">
      <div className="max-w-screen-xl mx-auto">
        <h2 className="text-3xl font-bold text-[var(--black)] mb-8">
          Browse by category
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {categories?.map((category) => {
            const Icon = categoryIcons[category.icon as keyof typeof categoryIcons]
            
            return (
              <Link
                key={category.id}
                href={`/search?category=${category.slug}`}
                className="group"
              >
                <div className="flex flex-col items-center p-6 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
                    {Icon && <Icon className="h-8 w-8 text-[var(--gray-dark)]" />}
                  </div>
                  <span className="text-sm font-medium text-[var(--black)] text-center">
                    {category.name}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}