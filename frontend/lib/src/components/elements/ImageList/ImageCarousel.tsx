/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2025)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, {
  CSSProperties,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react"

import { Image as ImageProto } from "@streamlit/protobuf"

import { StreamlitEndpoints } from "~lib/StreamlitEndpoints"
import StreamlitMarkdown from "~lib/components/shared/StreamlitMarkdown"
import { ElementFullscreenContext } from "~lib/components/shared/ElementFullscreen/ElementFullscreenContext"
import { useRequiredContext } from "~lib/hooks/useRequiredContext"
import * as Primitives from "~lib/theme/primitives"

import { StyledCaption, StyledImageContainer } from "./styled-components"

export interface ImageCarouselProps {
  images: ImageProto[]
  endpoints: StreamlitEndpoints
  elementWidth: number
  imgStyle: CSSProperties
  isFullScreen?: boolean
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>) => void
}

export function ImageCarousel({
  images,
  endpoints,
  elementWidth,
  imgStyle,
  isFullScreen,
  onImageError,
}: ImageCarouselProps): ReactElement {
  const {
    expanded: isFullScreenContext,
    width,
    height,
  } = useRequiredContext(ElementFullscreenContext)

  // Use the isFullScreen prop passed from parent instead of context directly
  const actualIsFullScreen = isFullScreen ?? isFullScreenContext

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHoveredPrev, setIsHoveredPrev] = useState(false)
  const [isHoveredNext, setIsHoveredNext] = useState(false)
  const [maxImageHeight] = useState<number>(0)
  const [captionHeight, setCaptionHeight] = useState<number>(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const captionRef = useRef<HTMLDivElement>(null)

  const isFirstImage = currentIndex === 0
  const isLastImage = currentIndex === images.length - 1
  const hasCaption = Boolean(images[currentIndex]?.caption)

  const TRANSITION_DURATION = 500

  useEffect(() => {
    if (isFirstImage) {
      setIsHoveredPrev(false)
    }
    if (isLastImage) {
      setIsHoveredNext(false)
    }
  }, [isFirstImage, isLastImage])

  useEffect(() => {
    if (captionRef.current && hasCaption) {
      setCaptionHeight(captionRef.current.offsetHeight)
    } else {
      setCaptionHeight(0)
    }
  }, [hasCaption, currentIndex])

  const nextImage = (): void => {
    setIsTransitioning(true)
    setCurrentIndex(oldIndex => (oldIndex + 1) % images.length)

    setTimeout(() => {
      setIsTransitioning(false)
    }, TRANSITION_DURATION)
  }

  const prevImage = (): void => {
    setIsTransitioning(true)
    setCurrentIndex(oldIndex =>
      oldIndex === 0 ? images.length - 1 : oldIndex - 1
    )

    setTimeout(() => {
      setIsTransitioning(false)
    }, TRANSITION_DURATION)
  }

  const goToImage = (index: number): void => {
    if (index === currentIndex) return

    setIsTransitioning(true)
    setCurrentIndex(index)

    setTimeout(() => {
      setIsTransitioning(false)
    }, TRANSITION_DURATION)
  }

  const getImageFullscreenHeight = (): string | number => {
    if (actualIsFullScreen && height) {
      // Reserve space for caption if it exists
      const reservedHeight = hasCaption ? captionHeight + 20 : 0
      return Math.max(height - reservedHeight, 100)
    }
    return maxImageHeight > 0 ? `${maxImageHeight}px` : "auto"
  }

  const isVisible = (index: number): boolean => {
    if (isTransitioning) {
      return true
    }
    return index === currentIndex
  }

  // Get the container width - use elementWidth when not in fullscreen
  // For carousel, we need to respect the image width from imgStyle if it's explicitly set
  const containerWidth = actualIsFullScreen ? width : elementWidth

  return (
    <StyledImageContainer data-testid="stImageCarousel">
      <div
        style={{
          position: "relative",
          width: containerWidth ?? "100%",
          height: getImageFullscreenHeight(),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            transition: "transform 500ms ease-in-out",
            transform: `translateX(-${
              currentIndex * (containerWidth || elementWidth)
            }px)`,
            width: `${images.length * (containerWidth || elementWidth)}px`,
            height: "100%",
          }}
        >
          {images.map((image, idx) => (
            <img
              // TODO: Update to match React best practices
              // eslint-disable-next-line @eslint-react/no-array-index-key
              key={idx}
              style={{
                ...imgStyle,
                boxSizing: "border-box",
                width: imgStyle.width ?? containerWidth ?? "100%",
                maxWidth: imgStyle.maxWidth ?? containerWidth ?? "100%",
                height: actualIsFullScreen
                  ? "100%"
                  : maxImageHeight > 0
                  ? `${maxImageHeight}px`
                  : "auto",
                maxHeight: actualIsFullScreen ? "100%" : undefined,
                flexShrink: 0,
                objectFit: actualIsFullScreen
                  ? "contain"
                  : imgStyle.objectFit || "contain",
                display: "block",
                backgroundColor: "transparent",
                opacity: isVisible(idx) ? 1 : 0,
              }}
              src={endpoints.buildMediaURL(image.url ?? "")}
              alt={`image-${idx}`}
              onError={onImageError}
            />
          ))}
        </div>

        {!isFirstImage && (
          <button
            data-testid="carousel-prev-button"
            type="button"
            onClick={prevImage}
            aria-label="Previous"
            onMouseEnter={() => setIsHoveredPrev(true)}
            onMouseLeave={() => setIsHoveredPrev(false)}
            style={{
              position: "absolute",
              top: "50%",
              left: "1rem",
              transform: "translateY(-50%)",
              background: isHoveredPrev
                ? "rgba(255, 255, 255, 0.4)"
                : "rgba(100, 100, 100, 0.4)",
              color: isHoveredPrev ? "black" : "white",
              border: isHoveredPrev
                ? "1px solid rgba(0, 0, 0, 0.4)"
                : "1px solid rgba(255, 255, 255, 0.4)",
              borderRadius: Primitives.sizes.full,
              width: Primitives.sizes.buttonSize,
              height: Primitives.sizes.buttonSize,
              fontSize: Primitives.fontSizes.fourXL,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingBottom: Primitives.iconSizes.xs,
              paddingRight: Primitives.iconSizes.xs,
            }}
          >
            ‹
          </button>
        )}
        {!isLastImage && (
          <button
            data-testid="carousel-next-button"
            type="button"
            onClick={nextImage}
            aria-label="Next"
            onMouseEnter={() => setIsHoveredNext(true)}
            onMouseLeave={() => setIsHoveredNext(false)}
            style={{
              position: "absolute",
              top: "50%",
              right: "1rem",
              transform: "translateY(-50%)",
              background: isHoveredNext
                ? "rgba(255, 255, 255, 0.4)"
                : "rgba(100, 100, 100, 0.4)",
              color: isHoveredNext ? "black" : "white",
              border: isHoveredNext
                ? "1px solid rgba(0, 0, 0, 0.4)"
                : "1px solid rgba(255, 255, 255, 0.4)",
              borderRadius: Primitives.sizes.full,
              width: Primitives.sizes.buttonSize,
              height: Primitives.sizes.buttonSize,
              fontSize: Primitives.fontSizes.fourXL,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingBottom: Primitives.iconSizes.xs,
              paddingLeft: Primitives.iconSizes.xs,
            }}
          >
            ›
          </button>
        )}
        <div
          style={{
            position: "absolute",
            bottom: Primitives.spacing.md,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            backgroundColor: Primitives.colors.gray80,
            padding: Primitives.sizes.spinnerThickness,
            borderRadius: Primitives.sizes.smallLogoHeight,
          }}
        >
          {images.map((_, index) => (
            <span
              // TODO: Update to match React best practices
              // eslint-disable-next-line @eslint-react/no-array-index-key
              key={index}
              onClick={() => goToImage(index)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  goToImage(index)
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                display: "inline-block",
                width: Primitives.iconSizes.sm,
                height: Primitives.iconSizes.sm,
                margin: `${Primitives.spacing.none} ${Primitives.spacing.twoXS}`,
                borderRadius: "50%",
                backgroundColor: index === currentIndex ? "white" : "gray",
                cursor: "pointer",
                transition: "background-color 200ms",
                border: index === currentIndex ? "2px solid white" : "none",
                boxSizing: "border-box",
              }}
              data-testid={`carousel-dot-${index}`}
            />
          ))}
        </div>
      </div>

      {hasCaption && (
        <StyledCaption
          ref={captionRef}
          data-testid="stImageCaption"
          style={imgStyle}
        >
          <StreamlitMarkdown
            source={images[currentIndex].caption}
            allowHTML={false}
            isCaption
            isLabel
          />
        </StyledCaption>
      )}
    </StyledImageContainer>
  )
}
