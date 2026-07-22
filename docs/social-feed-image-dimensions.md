# X And LinkedIn Feed Image Dimensions

Checked July 22, 2026. This note covers ordinary organic image posts, not link previews, ads, profile headers, or banners.

## Recommended Exports

| Use | X | LinkedIn |
| --- | --- | --- |
| Single portrait image | **1200 x 1500 px (4:5)** | **1080 x 1350 px (4:5)** |
| Single square image | **1200 x 1200 px (1:1)** | **1080 x 1080 px (1:1)** |
| One shared asset for both | **1080 x 1350 px (4:5)** | **1080 x 1350 px (4:5)** |
| Multi-image post | Prefer **square images** with center-safe content | Prefer **square images** with center-safe content |

The pixel sizes above are practical export recommendations, not universal platform mandates. A shared 1080 x 1350 asset is inside both platforms' documented full-image aspect-ratio ranges and uses LinkedIn's officially recommended 1080 px width. Square is the safer multi-image default because both platforms compose galleries and LinkedIn explicitly warns that some gallery cells may be cropped.

## X

- X does **not** specify one official pixel dimension for an ordinary feed photo. Its Help Center says a single image with an aspect ratio from **2:1 through 3:4** displays in full. Both 4:5 and 1:1 fall inside that range.
- A post can contain **1-4 photos**. Photos may be reordered in the composer when two or more are selected.
- Photos can be up to **5 MB**. The consumer Help Center accepts GIF, JPEG, and PNG; X's current API documentation additionally accepts WebP.
- Multi-image posts use a composed layout rather than the single-image full-display rule. X does not publish fixed gallery-cell dimensions in the cited first-party documentation, so keep important text, faces, and logos away from edges and verify the composer preview.
- An animated GIF cannot be combined with multiple images; a post can contain only one GIF.

Sources:

- X Help, "How to post photos or GIFs on X": https://help.x.com/en/using-x/posting-gifs-and-pictures
- X Developer Platform, media upload best practices: https://docs.x.com/x-api/media/quickstart/best-practices

## LinkedIn

- LinkedIn recommends photos be **1080 px wide**. The minimum is **552 x 276 px**, the upload limit is **5 MB**, and the accepted aspect-ratio range is **3:1 through 4:5**. Images outside the range are centered and cropped to the maximum ratio.
- For a portrait feed asset, **1080 x 1350 px (4:5)** combines LinkedIn's recommended width with its tallest supported ratio. **1080 x 1080 px (1:1)** is the straightforward square option.
- A multi-photo post can contain up to **20 photos** and renders in a container no taller than **4:5**. The first image receives more visual emphasis and its orientation controls the layout.
- Two images appear side by side while retaining their aspect ratios. With three or more, cells may be cropped: a landscape first image appears above the others, while a portrait or square first image appears on the left with other images stacked on the right.

Source:

- LinkedIn Help, "Share photos on LinkedIn": https://www.linkedin.com/help/linkedin/answer/a527229

## Do Not Reuse These Specs Blindly

- **LinkedIn link previews** are a different placement. LinkedIn recommends **1200 x 627 px (1.91:1)** for a Page URL preview: https://www.linkedin.com/help/linkedin/answer/a566445
- **X link cards**, paid ads, profile headers, and banners have separate rendering rules and specifications. They are not evidence for ordinary feed-photo dimensions.
- **LinkedIn Sponsored Content** and Page/Career cover imagery likewise use separate ad or banner specifications. The organic photo-post guidance above should not be inferred from those placements.
