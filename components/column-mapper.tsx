"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export function ColumnMapper({ contentTypeFields, csvHeaders, fieldMapping, onMappingChange }) {
  return (
    <div className="space-y-4">
      {contentTypeFields.map((field) => (
        <div key={field.name} className="grid grid-cols-3 gap-4 items-center">
          <div>
            <span className="font-medium">{field.name}</span>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">{field.type}</Badge>
              {field.required && <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Required</Badge>}
            </div>
          </div>

          <div className="col-span-2">
            <Select
              value={fieldMapping[field.name] || ""}
              onValueChange={(value) => onMappingChange(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select CSV column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Not mapped --</SelectItem>
                {csvHeaders.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </div>
  )
}
