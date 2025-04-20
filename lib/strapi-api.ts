// Update the fetchStrapiContentTypes function to add a new approach that uses a known endpoint
export async function fetchStrapiContentTypes(strapiUrl: string, token: string, knownEndpoint?: string) {
  // Ensure the URL doesn't end with a slash
  const baseUrl = strapiUrl.endsWith("/") ? strapiUrl.slice(0, -1) : strapiUrl

  try {
    // Try multiple approaches to get content types
    const approaches = [
      // New Approach: Try using a known endpoint if provided
      async () => {
        if (!knownEndpoint) return null

        console.log(`Trying known endpoint: ${knownEndpoint}...`)
        const endpointParts = knownEndpoint.split("/")
        // Extract the content type name from the endpoint (e.g., "iframes" from "/api/iframes")
        const contentTypeName = endpointParts[endpointParts.length - 1]

        if (!contentTypeName) return null

        // Try to fetch schema from the known endpoint
        const response = await fetch(`${baseUrl}${knownEndpoint}?pagination[limit]=1`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) throw new Error(`Known endpoint failed: ${response.status}`)

        const data = await response.json()
        console.log("Known endpoint response:", data)

        // Create a content type from the known endpoint
        const contentType = {
          uid: `api::${contentTypeName}.${contentTypeName}`,
          apiID: contentTypeName,
          displayName: contentTypeName.charAt(0).toUpperCase() + contentTypeName.slice(1),
          attributes: {},
        }

        // Extract attributes if possible
        if (data.data && data.data.length > 0 && data.data[0].attributes) {
          const attributes = {}
          Object.entries(data.data[0].attributes).forEach(([key, value]) => {
            // Skip relationship fields for now
            if (value !== null && typeof value === "object" && "data" in value) {
              return
            }

            attributes[key] = {
              type: typeof value,
              required: false,
            }
          })

          contentType.attributes = attributes
        }

        // Try to discover other content types by examining the links in the response
        const otherContentTypes = []
        if (data.meta && data.meta.pagination && data.meta.pagination.links) {
          // Extract content type names from links
          const links = Object.values(data.meta.pagination.links)
          for (const link of links) {
            if (typeof link === "string" && link.includes("/api/")) {
              const match = link.match(/\/api\/([^/?]+)/)
              if (match && match[1] && match[1] !== contentTypeName) {
                otherContentTypes.push({
                  uid: `api::${match[1]}.${match[1]}`,
                  apiID: match[1],
                  displayName: match[1].charAt(0).toUpperCase() + match[1].slice(1),
                  attributes: {},
                })
              }
            }
          }
        }

        return [contentType, ...otherContentTypes]
      },

      // Approach 1: Try the public API endpoint (Strapi v4)
      async () => {
        console.log("Trying public API endpoint...")
        const response = await fetch(`${baseUrl}/api`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) throw new Error(`Public API failed: ${response.status}`)

        const data = await response.json()
        console.log("Public API response:", data)

        if (typeof data !== "object" || Object.keys(data).length === 0) {
          throw new Error("No content types found in API response")
        }

        // Transform the API routes into content types
        return Object.keys(data).map((key) => ({
          uid: `api::${key}.${key}`,
          apiID: key,
          displayName: key.charAt(0).toUpperCase() + key.slice(1),
          attributes: {}, // We'll fetch attributes separately
        }))
      },

      // Approach 2: Try the Content-Type Builder API (admin API)
      async () => {
        console.log("Trying Content-Type Builder API...")
        const response = await fetch(`${baseUrl}/content-type-builder/content-types`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) throw new Error(`Admin API failed: ${response.status}`)
        const data = await response.json()
        return data.data
      },

      // Approach 3: Try the content-manager API (Strapi v4)
      async () => {
        console.log("Trying content-manager API...")
        const response = await fetch(`${baseUrl}/content-manager/content-types`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) throw new Error(`Content manager API failed: ${response.status}`)
        const data = await response.json()
        return data.data
      },

      // Approach 4: Try the collection-types API (Strapi v4)
      async () => {
        console.log("Trying collection-types API...")
        const response = await fetch(`${baseUrl}/content-manager/collection-types`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) throw new Error(`Collection types API failed: ${response.status}`)
        const data = await response.json()
        return data.data
      },

      // Approach 5: Try to discover content types by scanning common endpoints
      async () => {
        console.log("Trying to discover content types by scanning common endpoints...")
        // List of common content type names to try
        const commonTypes = [
          "articles",
          "pages",
          "products",
          "categories",
          "tags",
          "users",
          "posts",
          "comments",
          "media",
          "files",
          "images",
          "videos",
          "iframes",
          "settings",
          "menus",
          "navigation",
        ]

        const discoveredTypes = []

        for (const type of commonTypes) {
          try {
            const response = await fetch(`${baseUrl}/api/${type}?pagination[limit]=1`, {
              headers: {
                Authorization: token ? `Bearer ${token}` : "",
                "Content-Type": "application/json",
              },
            })

            if (response.ok) {
              const data = await response.json()
              console.log(`Discovered endpoint: /api/${type}`)

              const contentType = {
                uid: `api::${type}.${type}`,
                apiID: type,
                displayName: type.charAt(0).toUpperCase() + type.slice(1),
                attributes: {},
              }

              // Extract attributes if possible
              if (data.data && data.data.length > 0 && data.data[0].attributes) {
                const attributes = {}
                Object.entries(data.data[0].attributes).forEach(([key, value]) => {
                  // Skip relationship fields for now
                  if (value !== null && typeof value === "object" && "data" in value) {
                    return
                  }

                  attributes[key] = {
                    type: typeof value,
                    required: false,
                  }
                })

                contentType.attributes = attributes
              }

              discoveredTypes.push(contentType)
            }
          } catch (error) {
            // Ignore errors for this approach
            console.log(`Error checking ${type}:`, error.message)
          }
        }

        if (discoveredTypes.length > 0) {
          return discoveredTypes
        }

        throw new Error("No content types discovered by scanning common endpoints")
      },
    ]

    // Try each approach in sequence until one succeeds
    let lastError = null
    let contentTypes = null

    for (const approach of approaches) {
      try {
        contentTypes = await approach()
        if (contentTypes && contentTypes.length > 0) {
          break // We found content types, stop trying approaches
        }
      } catch (error) {
        lastError = error
        console.warn("Approach failed:", error.message)
        // Continue to the next approach
      }
    }

    // If we didn't find any content types, throw an error
    if (!contentTypes || contentTypes.length === 0) {
      throw new Error(`Could not fetch content types from Strapi. Last error: ${lastError?.message || "Unknown error"}`)
    }

    // For each content type, try to fetch its schema/attributes if they're not already included
    for (const type of contentTypes) {
      if (!type.attributes || Object.keys(type.attributes).length === 0) {
        try {
          // Extract the collection name from the UID (e.g., "api::article.article" -> "article")
          const collectionName = type.apiID || type.uid.split(".").pop()

          if (!collectionName) continue

          console.log(`Fetching schema for ${collectionName}...`)

          // Try to fetch a single item to infer the schema
          const schemaResponse = await fetch(`${baseUrl}/api/${collectionName}?pagination[limit]=1`, {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
              "Content-Type": "application/json",
            },
          })

          if (schemaResponse.ok) {
            const schemaData = await schemaResponse.json()

            if (schemaData.data && schemaData.data.length > 0 && schemaData.data[0].attributes) {
              // Extract attributes from the first item
              const attributes = {}
              Object.entries(schemaData.data[0].attributes).forEach(([key, value]) => {
                // Skip relationship fields for now
                if (value !== null && typeof value === "object" && "data" in value) {
                  return
                }

                attributes[key] = {
                  type: typeof value,
                  required: false, // We can't know this without the schema
                }
              })

              type.attributes = attributes
            }
          }
        } catch (error) {
          console.error(`Error fetching schema for ${type.uid}:`, error)
        }
      }
    }

    return contentTypes
  } catch (error) {
    console.error("Error fetching Strapi content types:", error)
    throw new Error(`Failed to connect to Strapi: ${error.message || "Network error"}`)
  }
}
