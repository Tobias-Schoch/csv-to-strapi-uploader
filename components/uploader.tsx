"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronRight, AlertCircle, CheckCircle2, Upload, Info, Pause, Play } from "lucide-react"
import { ColumnMapper } from "@/components/column-mapper"
import { fetchStrapiContentTypes } from "@/lib/strapi-api"
import { Slider } from "@/components/ui/slider"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Switch } from "@/components/ui/switch"

export function Uploader() {
  const [step, setStep] = useState(1)
  const [strapiUrl, setStrapiUrl] = useState("")
  const [strapiToken, setStrapiToken] = useState("")
  const [contentTypes, setContentTypes] = useState([])
  const [selectedContentType, setSelectedContentType] = useState("")
  const [contentTypeFields, setContentTypeFields] = useState([])
  const [csvFile, setCsvFile] = useState(null)
  const [csvData, setCsvData] = useState([])
  const [csvHeaders, setCsvHeaders] = useState([])
  const [hasHeaders, setHasHeaders] = useState(true)
  const [separator, setSeparator] = useState(",")
  const [fieldMapping, setFieldMapping] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [progress, setProgress] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [processedRows, setProcessedRows] = useState(0)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [debugInfo, setDebugInfo] = useState("")
  const fileInputRef = useRef(null)
  const [knownEndpoint, setKnownEndpoint] = useState("")
  const [batchSize, setBatchSize] = useState(1) // Default to 1 item per batch
  const [delayBetweenRequests, setDelayBetweenRequests] = useState(500) // Default to 500ms delay
  const [isPaused, setIsPaused] = useState(false)
  const [startFromRow, setStartFromRow] = useState(0)
  const [failedRows, setFailedRows] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [defaultValues, setDefaultValues] = useState({})
  const [convertEmptyToNull, setConvertEmptyToNull] = useState(true)
  const [convertEmptyNumbersToZero, setConvertEmptyNumbersToZero] = useState(true)
  const [skipEmptyValues, setSkipEmptyValues] = useState(false)

  // Add this function to test the connection before fetching content types
  const testStrapiConnection = async (url, token) => {
    try {
      // Ensure URL doesn't end with a slash
      const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url

      // If we have a known endpoint, try that first
      if (knownEndpoint) {
        try {
          const response = await fetch(`${baseUrl}${knownEndpoint}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })

          if (response.ok) {
            console.log("Connection successful using known endpoint")
            return true
          }
        } catch (error) {
          console.error("Error testing known endpoint:", error)
        }
      }

      // Try a simple request to check if the server is reachable
      const response = await fetch(`${baseUrl}/api`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Authentication failed. Please check your API token.")
        } else {
          throw new Error(`Server responded with status: ${response.status}`)
        }
      }

      return true
    } catch (error) {
      if (error.message === "Failed to fetch") {
        throw new Error("Could not connect to the server. Please check the URL and ensure CORS is enabled.")
      }
      throw error
    }
  }

  // Update the fetchContentTypes function to use the test connection
  const fetchContentTypes = async () => {
    if (!strapiUrl) {
      setError("Please provide Strapi URL")
      return
    }

    setIsLoading(true)
    setError("")
    setDebugInfo("")

    try {
      // Validate URL format
      let url = strapiUrl
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url
        setStrapiUrl(url)
      }

      // Test connection first
      await testStrapiConnection(url, strapiToken)

      // If connection test passes, fetch content types
      const types = await fetchStrapiContentTypes(url, strapiToken, knownEndpoint)

      if (!types || types.length === 0) {
        setError("No content types found in your Strapi instance. Please check your permissions and API configuration.")
        setIsLoading(false)
        return
      }

      // Log the content types for debugging
      console.log("Content types:", types)
      setDebugInfo(JSON.stringify(types, null, 2))

      setContentTypes(types)
      setIsLoading(false)
      setStep(2)
    } catch (err) {
      console.error("Fetch error:", err)

      // Provide specific guidance based on the error
      let errorMessage = err.message || "Failed to connect to Strapi"

      if (errorMessage.includes("CORS")) {
        errorMessage += ". You need to configure CORS in your Strapi instance to allow requests from this domain."
      } else if (errorMessage.includes("content types")) {
        errorMessage +=
            ". Make sure your API token has permissions to access content types and the Content-Type Builder API."
      }

      setError(`${errorMessage}. Please check your URL, token, and Strapi configuration.`)
      setIsLoading(false)
    }
  }

  // Handle content type selection
  const handleContentTypeSelect = (value) => {
    setSelectedContentType(value)

    // Find the selected content type and extract its fields
    const selectedType = contentTypes.find((type) => type.uid === value)
    if (selectedType && selectedType.attributes) {
      const fields = Object.entries(selectedType.attributes)
          .filter(([_, attr]) => !attr.private && !attr.collection)
          .map(([name, attr]) => ({
            name,
            type: attr.type,
            required: attr.required || false,
          }))

      setContentTypeFields(fields)

      // Initialize field mapping with empty values
      const initialMapping = {}
      const initialDefaults = {}
      fields.forEach((field) => {
        initialMapping[field.name] = ""
        // Set default values based on field type
        if (field.type === "number") {
          initialDefaults[field.name] = "0"
        } else if (field.type === "boolean") {
          initialDefaults[field.name] = "false"
        } else {
          initialDefaults[field.name] = ""
        }
      })
      setFieldMapping(initialMapping)
      setDefaultValues(initialDefaults)
    }
  }

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCsvFile(file)
      parseCSV(file)
    }
  }

  // Parse CSV file
  const parseCSV = (file) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length === 0) {
        setError("The CSV file appears to be empty")
        return
      }

      // Parse headers and data based on separator
      const parsedData = lines.map((line) => line.split(separator))

      if (hasHeaders) {
        setCsvHeaders(parsedData[0])
        setCsvData(parsedData.slice(1))
      } else {
        // Generate numeric headers if no headers are present
        setCsvHeaders(Array.from({ length: parsedData[0].length }, (_, i) => `Column ${i + 1}`))
        setCsvData(parsedData)
      }

      setTotalRows(hasHeaders ? parsedData.length - 1 : parsedData.length)
      setStep(3)
    }

    reader.onerror = () => {
      setError("Error reading the file")
    }

    reader.readAsText(file)
  }

  // Handle field mapping change
  const handleMappingChange = (fieldName, csvColumn) => {
    setFieldMapping((prev) => ({
      ...prev,
      [fieldName]: csvColumn,
    }))
  }

  // Handle default value change
  const handleDefaultValueChange = (fieldName, value) => {
    setDefaultValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  // Sleep function for delay between requests
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  // Process value based on field type and settings
  const processFieldValue = (fieldName, value) => {
    // Get the field definition
    const field = contentTypeFields.find((f) => f.name === fieldName)
    if (!field) return value

    // Handle empty values
    if (value === undefined || value === null || value === "") {
      if (skipEmptyValues) {
        return undefined // Skip this field entirely
      }

      if (convertEmptyToNull) {
        return null
      }

      // Use default value for empty fields
      if (defaultValues[fieldName] !== undefined && defaultValues[fieldName] !== "") {
        value = defaultValues[fieldName]
      }
    }

    // Convert types based on field type
    if (field.type === "number") {
      const num = Number(value)
      if (isNaN(num) && value !== null) {
        // If it's not a valid number and not null, use default or 0
        if (convertEmptyNumbersToZero) {
          return 0
        }
        return defaultValues[fieldName] !== undefined ? Number(defaultValues[fieldName]) : null
      }
      return num
    } else if (field.type === "boolean") {
      if (typeof value === "string") {
        const lowercaseValue = value.toLowerCase()
        if (["true", "yes", "1", "y"].includes(lowercaseValue)) {
          return true
        } else if (["false", "no", "0", "n"].includes(lowercaseValue)) {
          return false
        }
      }
      // If not a recognized boolean string, use default
      return defaultValues[fieldName] !== undefined
          ? ["true", "yes", "1", "y"].includes(defaultValues[fieldName].toLowerCase())
          : null
    }

    return value
  }

  // Validate a single row before uploading
  const validateRow = (row) => {
    const errors = []

    // Map CSV columns to Strapi fields
    const entry = {}
    Object.entries(fieldMapping).forEach(([fieldName, csvColumn]) => {
      if (csvColumn && csvColumn !== "none") {
        const columnIndex = csvHeaders.indexOf(csvColumn)
        if (columnIndex !== -1) {
          const rawValue = row[columnIndex]
          const processedValue = processFieldValue(fieldName, rawValue)

          // Only add the field if it's not undefined (for skipEmptyValues)
          if (processedValue !== undefined) {
            entry[fieldName] = processedValue
          }
        }
      }
    })

    // Check for required fields
    contentTypeFields.forEach((field) => {
      if (
          field.required &&
          (entry[field.name] === undefined || entry[field.name] === null || entry[field.name] === "")
      ) {
        errors.push(`Required field "${field.name}" is missing or empty`)
      }
    })

    // Check for data type mismatches
    Object.entries(entry).forEach(([fieldName, value]) => {
      const field = contentTypeFields.find((f) => f.name === fieldName)
      if (field) {
        if (field.type === "number" && typeof value === "string" && isNaN(Number(value))) {
          errors.push(`Field "${fieldName}" expects a number, but got "${value}"`)
        } else if (
            field.type === "boolean" &&
            typeof value === "string" &&
            !["true", "false", "0", "1", "yes", "no", "y", "n"].includes(value.toLowerCase())
        ) {
          errors.push(`Field "${fieldName}" expects a boolean, but got "${value}"`)
        }
      }
    })

    return { entry, errors }
  }

  // Upload data to Strapi
  const uploadToStrapi = async () => {
    if (!selectedContentType || !csvData.length) {
      setError("Please select a content type and upload a CSV file")
      return
    }

    // Check if all required fields are mapped
    const requiredFields = contentTypeFields.filter((field) => field.required)
    const missingMappings = requiredFields.filter((field) => !fieldMapping[field.name])

    if (missingMappings.length > 0) {
      setError(`Please map all required fields: ${missingMappings.map((f) => f.name).join(", ")}`)
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")
    setProgress(0)
    setProcessedRows(startFromRow)
    setFailedRows([])
    setValidationErrors([])
    setIsPaused(false)

    try {
      // Pre-validate all rows
      const validationResults = []
      for (let i = startFromRow; i < csvData.length; i++) {
        const row = csvData[i]
        const result = validateRow(row)
        validationResults.push({ rowIndex: i, ...result })
      }

      // Filter rows with validation errors
      const invalidRows = validationResults.filter((result) => result.errors.length > 0)
      if (invalidRows.length > 0) {
        setValidationErrors(invalidRows)
        if (invalidRows.length === validationResults.length) {
          setError("All rows have validation errors. Please fix the data and try again.")
          setIsLoading(false)
          return
        }
      }

      // Process rows in batches
      for (let i = startFromRow; i < csvData.length; i += batchSize) {
        // Check if upload is paused
        if (isPaused) {
          setError("Upload paused. Click 'Resume' to continue.")
          setIsLoading(false)
          return
        }

        const batch = []
        for (let j = 0; j < batchSize && i + j < csvData.length; j++) {
          const rowIndex = i + j
          const row = csvData[rowIndex]

          // Skip rows with validation errors
          const validationResult = validationResults.find((r) => r.rowIndex === rowIndex)
          if (validationResult && validationResult.errors.length > 0) {
            continue
          }

          batch.push({ rowIndex, row })
        }

        // Process the batch
        const results = await Promise.allSettled(
            batch.map(async ({ rowIndex, row }) => {
              try {
                const { entry } = validateRow(row)
                await createStrapiEntry(selectedContentType, entry)
                return { success: true, rowIndex }
              } catch (error) {
                return { success: false, rowIndex, error }
              }
            }),
        )

        // Handle results
        const failedInBatch = results
            .filter((result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.success))
            .map((result) => {
              if (result.status === "rejected") {
                return { rowIndex: batch[results.indexOf(result)].rowIndex, error: result.reason }
              } else {
                return result.value
              }
            })

        if (failedInBatch.length > 0) {
          setFailedRows((prev) => [...prev, ...failedInBatch])
        }

        // Update progress
        const successfulCount = results.filter((result) => result.status === "fulfilled" && result.value.success).length
        setProcessedRows((prev) => prev + successfulCount)
        setProgress(Math.round(((i + batch.length) / csvData.length) * 100))

        // Add delay between batches
        if (i + batchSize < csvData.length && delayBetweenRequests > 0) {
          await sleep(delayBetweenRequests)
        }
      }

      // Check if there were any failed rows
      if (failedRows.length > 0) {
        setError(
            `Upload completed with ${failedRows.length} errors. ${
                processedRows
            } entries were successfully uploaded. See details below.`,
        )
      } else {
        setSuccess(`Successfully uploaded ${processedRows} entries to Strapi`)
      }
    } catch (err) {
      setError("Error uploading to Strapi: " + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Create a single entry in Strapi
  const createStrapiEntry = async (contentType, data) => {
    try {
      // Ensure URL doesn't end with a slash
      const baseUrl = strapiUrl.endsWith("/") ? strapiUrl.slice(0, -1) : strapiUrl

      // Extract the collection name from the UID (e.g., "api::article.article" -> "article")
      const collectionName = contentType.split(".").pop()

      const endpoint = `${baseUrl}/api/${collectionName}`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(strapiToken ? { Authorization: `Bearer ${strapiToken}` } : {}),
        },
        body: JSON.stringify({ data }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || "Unknown error"
        const errorDetails = errorData.error?.details || {}

        // Format detailed error message
        let detailedError = `HTTP error ${response.status}: ${errorMessage}`

        if (errorDetails.errors && errorDetails.errors.length > 0) {
          detailedError += `. Errors: ${errorDetails.errors.map((e) => e.message || e.path).join(", ")}`
        }

        throw new Error(detailedError)
      }

      return await response.json()
    } catch (error) {
      console.error("Error creating Strapi entry:", error)
      throw error
    }
  }

  // Reset the form
  const resetForm = () => {
    setStep(1)
    setCsvFile(null)
    setCsvData([])
    setCsvHeaders([])
    setFieldMapping({})
    setProgress(0)
    setProcessedRows(0)
    setTotalRows(0)
    setStartFromRow(0)
    setFailedRows([])
    setValidationErrors([])
    setSuccess("")
    setError("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Toggle pause/resume upload
  const togglePause = () => {
    if (isLoading) {
      setIsPaused(!isPaused)
    } else if (isPaused) {
      setIsPaused(false)
      uploadToStrapi()
    }
  }

  // Retry failed rows
  const retryFailedRows = () => {
    if (failedRows.length === 0) return

    // Set the start row to the first failed row
    setStartFromRow(failedRows[0].rowIndex)
    setFailedRows([])
    uploadToStrapi()
  }

  return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>CSV to Strapi Uploader</CardTitle>
          <CardDescription>Upload your CSV data to Strapi with custom field mapping</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={`step-${step}`} className="w-full">
            <TabsList className="grid grid-cols-3 mb-8">
              <TabsTrigger value="step-1" disabled={step !== 1}>
                1. Connect to Strapi
              </TabsTrigger>
              <TabsTrigger value="step-2" disabled={step !== 2}>
                2. Select Content Type
              </TabsTrigger>
              <TabsTrigger value="step-3" disabled={step !== 3}>
                3. Map Fields
              </TabsTrigger>
            </TabsList>

            <TabsContent value="step-1">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="strapi-url">Strapi URL</Label>
                  <Input
                      id="strapi-url"
                      placeholder="https://your-strapi-instance.com"
                      value={strapiUrl}
                      onChange={(e) => setStrapiUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strapi-token">API Token</Label>
                  <Input
                      id="strapi-token"
                      type="password"
                      placeholder="Your Strapi API token"
                      value={strapiToken}
                      onChange={(e) => setStrapiToken(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Make sure your token has read/write permissions for the content types you want to access.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="known-endpoint">Known API Endpoint (Optional)</Label>
                  <Input
                      id="known-endpoint"
                      placeholder="/api/iframes"
                      value={knownEndpoint}
                      onChange={(e) => setKnownEndpoint(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If you know a working API endpoint, enter it here (e.g., /api/iframes)
                  </p>
                </div>

                <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    Your Strapi instance must have CORS configured to allow requests from this domain. Check the Strapi
                    documentation for how to configure CORS.
                  </AlertDescription>
                </Alert>

                <Button onClick={fetchContentTypes} disabled={isLoading || !strapiUrl} className="w-full">
                  {isLoading ? "Connecting..." : "Connect to Strapi"}
                  {!isLoading && <ChevronRight className="ml-2 h-4 w-4" />}
                </Button>

                <div className="flex items-center space-x-2">
                  <Checkbox id="show-debug" checked={showDebugInfo} onCheckedChange={setShowDebugInfo} />
                  <Label htmlFor="show-debug" className="text-sm text-gray-500">
                    Show debug information
                  </Label>
                </div>

                {showDebugInfo && debugInfo && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto max-h-60">
                      <pre className="text-xs">{debugInfo}</pre>
                    </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="step-2">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="content-type">Select Content Type</Label>
                  <Select onValueChange={handleContentTypeSelect} value={selectedContentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a content type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes.map((type) => (
                          <SelectItem key={type.uid} value={type.uid}>
                            {type.displayName || type.uid.split(".").pop()}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="has-headers" checked={hasHeaders} onCheckedChange={setHasHeaders} />
                    <Label htmlFor="has-headers">CSV has header row</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="separator">Column Separator</Label>
                    <Select onValueChange={setSeparator} value={separator}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select separator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=",">Comma (,)</SelectItem>
                        <SelectItem value=";">Semicolon (;)</SelectItem>
                        <SelectItem value="|">Pipe (|)</SelectItem>
                        <SelectItem value="\t">Tab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-file">Upload CSV File</Label>
                  <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="cursor-pointer"
                  />
                </div>

                <Button
                    onClick={() => (csvFile ? setStep(3) : null)}
                    disabled={!csvFile || !selectedContentType}
                    className="w-full"
                >
                  Continue to Mapping
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="step-3">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Map CSV Columns to Strapi Fields</h3>
                  <p className="text-sm text-gray-500">Select which CSV column corresponds to each Strapi field</p>
                </div>

                <ColumnMapper
                    contentTypeFields={contentTypeFields}
                    csvHeaders={csvHeaders}
                    fieldMapping={fieldMapping}
                    onMappingChange={handleMappingChange}
                />

                <Accordion
                    type="single"
                    collapsible
                    value={showAdvancedSettings ? "advanced" : ""}
                    onValueChange={(value) => setShowAdvancedSettings(value === "advanced")}
                >
                  <AccordionItem value="advanced">
                    <AccordionTrigger>Advanced Upload Settings</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-6 pt-2">
                        <div className="space-y-4">
                          <h4 className="font-medium">Empty Value Handling</h4>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="convert-empty-to-zero">Convert empty numbers to zero</Label>
                              <p className="text-sm text-gray-500">Empty number fields will be set to 0</p>
                            </div>
                            <Switch
                                id="convert-empty-to-zero"
                                checked={convertEmptyNumbersToZero}
                                onCheckedChange={setConvertEmptyNumbersToZero}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="convert-empty-to-null">Convert empty values to null</Label>
                              <p className="text-sm text-gray-500">
                                Empty fields will be set to null instead of empty string
                              </p>
                            </div>
                            <Switch
                                id="convert-empty-to-null"
                                checked={convertEmptyToNull}
                                onCheckedChange={setConvertEmptyToNull}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="skip-empty-values">Skip empty values</Label>
                              <p className="text-sm text-gray-500">Don't include empty fields in the upload</p>
                            </div>
                            <Switch
                                id="skip-empty-values"
                                checked={skipEmptyValues}
                                onCheckedChange={setSkipEmptyValues}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-medium">Default Values</h4>
                          <p className="text-sm text-gray-500">
                            Set default values for empty fields. These will be used if "Convert empty to zero" is
                            disabled.
                          </p>

                          <div className="space-y-4">
                            {contentTypeFields
                                .filter((field) => field.type === "number" || field.type === "boolean")
                                .map((field) => (
                                    <div key={field.name} className="grid grid-cols-2 gap-4 items-center">
                                      <Label htmlFor={`default-${field.name}`}>
                                        {field.name} ({field.type})
                                      </Label>
                                      <Input
                                          id={`default-${field.name}`}
                                          value={defaultValues[field.name] || ""}
                                          onChange={(e) => handleDefaultValueChange(field.name, e.target.value)}
                                          placeholder={field.type === "number" ? "0" : "false"}
                                      />
                                    </div>
                                ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-medium">Upload Settings</h4>

                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor="batch-size">Batch Size: {batchSize}</Label>
                              <span className="text-sm text-gray-500">Items per request</span>
                            </div>
                            <Slider
                                id="batch-size"
                                min={1}
                                max={10}
                                step={1}
                                value={[batchSize]}
                                onValueChange={(value) => setBatchSize(value[0])}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor="delay">Delay Between Requests: {delayBetweenRequests}ms</Label>
                              <span className="text-sm text-gray-500">Milliseconds</span>
                            </div>
                            <Slider
                                id="delay"
                                min={0}
                                max={2000}
                                step={100}
                                value={[delayBetweenRequests]}
                                onValueChange={(value) => setDelayBetweenRequests(value[0])}
                            />
                          </div>

                          {processedRows > 0 && (
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <Label htmlFor="start-row">Start From Row: {startFromRow}</Label>
                                  <span className="text-sm text-gray-500">Skip previous rows</span>
                                </div>
                                <Slider
                                    id="start-row"
                                    min={0}
                                    max={csvData.length - 1}
                                    step={1}
                                    value={[startFromRow]}
                                    onValueChange={(value) => setStartFromRow(value[0])}
                                />
                              </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex gap-2">
                  <Button onClick={uploadToStrapi} disabled={isLoading && !isPaused} className="flex-1">
                    {isLoading && !isPaused ? "Uploading..." : "Upload to Strapi"}
                    {!isLoading && <Upload className="ml-2 h-4 w-4" />}
                  </Button>

                  {isLoading && (
                      <Button variant="outline" onClick={togglePause}>
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </Button>
                  )}

                  {!isLoading && isPaused && (
                      <Button variant="outline" onClick={togglePause}>
                        <Play className="h-4 w-4" /> Resume
                      </Button>
                  )}

                  {failedRows.length > 0 && !isLoading && (
                      <Button variant="outline" onClick={retryFailedRows}>
                        Retry Failed ({failedRows.length})
                      </Button>
                  )}
                </div>

                {isLoading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                    <span>
                      Progress: {processedRows} of {totalRows} rows
                    </span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                )}

                {validationErrors.length > 0 && (
                    <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription>
                        {validationErrors.length} rows have validation errors and will be skipped.{" "}
                        <Button
                            variant="link"
                            className="p-0 h-auto text-yellow-800 underline"
                            onClick={() => setShowDebugInfo(true)}
                        >
                          Show details
                        </Button>
                      </AlertDescription>
                    </Alert>
                )}

                {showDebugInfo && validationErrors.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto max-h-60">
                      <h4 className="font-medium mb-2">Validation Errors:</h4>
                      {validationErrors.map((error, index) => (
                          <div key={index} className="mb-2 pb-2 border-b border-gray-200">
                            <p className="font-medium">Row {error.rowIndex + 1}:</p>
                            <ul className="list-disc pl-5">
                              {error.errors.map((err, i) => (
                                  <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                      ))}
                    </div>
                )}

                {failedRows.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto max-h-60">
                      <h4 className="font-medium mb-2">Failed Rows:</h4>
                      {failedRows.map((failure, index) => (
                          <div key={index} className="mb-2 pb-2 border-b border-gray-200">
                            <p className="font-medium">Row {failure.rowIndex + 1}:</p>
                            <p className="text-red-600">{failure.error?.message || "Unknown error"}</p>
                          </div>
                      ))}
                    </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error && (
              <Alert variant="destructive" className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
          )}

          {success && (
              <Alert className="mt-6 bg-green-50 border-green-200 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={resetForm}>
            Start Over
          </Button>

          {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
          )}
        </CardFooter>
      </Card>
  )
}
