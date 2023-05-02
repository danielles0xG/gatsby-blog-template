/**
 * Bio component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.com/docs/how-to/querying-data/use-static-query/
 */

import * as React from "react"
import { useStaticQuery, graphql } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"

const Bio = () => {
  const data = useStaticQuery(graphql`
    query BioQuery {
      site {
        siteMetadata {
          author {
            name
            summary
          }
          social {
            twitter
          }
        }
      }
    }
  `)

  // Set these values by editing "siteMetadata" in gatsby-config.js
  const author = data.site.siteMetadata?.author
  const social = data.site.siteMetadata?.social

  return (
    <div className="bio">
      <StaticImage
        className="bio-avatar"
        layout="fixed"
        formats={["auto", "webp", "avif"]}
        src="../images/profile-pic.png"
        width={50}
        height={50}
        quality={95}
        alt="Profile picture"
      />
      {author?.name && (
        <section>
        <p>
          Written by <strong>{author.name}</strong> {author?.summary || null}
          {` `}
        </p>
          <p> 
             <a href={`https://twitter.com/${social?.twitter || ``}`}  target="_blank" style={{padding:"5px"}}>
            twitter
          </a>
          ||
          <a href={`https://www.linkedin.com/in/danielifg`}  target="_blank" style={{padding:"5px"}}>
            linkedin
          </a> 
          ||
          <a href={`https://github.com/danielles0xG`}  target="_blank" style={{padding:"5px"}}>
            github
          </a> 
          ||
          <a href={`https://ipfs.io/ipfs/QmerukptQGsMC73TbJtusc73Njixbh44i88AVkpF6vtC4F?filename=DanielG_d0423.pdf`}  target="_blank" style={{padding:"5px"}}>
            resume
          </a> 
        </p>
         
        </section>
      )}
    
    </div>
  )
}

export default Bio
