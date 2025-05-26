"use client"

import { Palette } from "lucide-react"
import { useTheme } from "@/src/styles/ThemeProvider"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const colorSchemes = [
  { name: "Blue", value: "blue", color: "bg-blue-500" },
  { name: "Purple", value: "purple", color: "bg-purple-500" },
  { name: "Green", value: "green", color: "bg-green-500" },
  { name: "Orange", value: "orange", color: "bg-orange-500" },
  { name: "Neutral", value: "neutral", color: "bg-gray-500" },
] as const

export function ColorSchemeSelector() {
  const { colorScheme, setColorScheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Select color scheme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {colorSchemes.map((scheme) => (
          <DropdownMenuItem key={scheme.value} onClick={() => setColorScheme(scheme.value)}>
            <div className={`mr-2 h-4 w-4 rounded-full ${scheme.color}`} />
            <span>{scheme.name}</span>
            {colorScheme === scheme.value && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
