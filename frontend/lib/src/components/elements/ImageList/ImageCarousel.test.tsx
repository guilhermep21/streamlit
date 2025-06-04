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

import React from "react"

import { fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"

import { ImageList as ImageListProto } from "@streamlit/protobuf"

import { render } from "~lib/test_util"
import { mockEndpoints } from "~lib/mocks/mocks"
import * as UseResizeObserver from "~lib/hooks/useResizeObserver"

import ImageList, { ImageListProps } from "./ImageList"

describe("ImageList Element", () => {
  const buildMediaURL = vi.fn().mockReturnValue("https://mock.media.url")
  const sendClientErrorToHost = vi.fn()

  const getProps = (
    elementProps: Partial<ImageListProto> = {}
  ): ImageListProps => ({
    element: ImageListProto.create({
      imgs: [
        { caption: "a", url: "/media/mockImage1.jpeg" },
        { caption: "b", url: "/media/mockImage2.jpeg" },
      ],
      width: -1,
      ...elementProps,
      carousel: true,
    }),
    endpoints: mockEndpoints({
      buildMediaURL: buildMediaURL,
      sendClientErrorToHost: sendClientErrorToHost,
    }),
  })

  beforeEach(() => {
    vi.spyOn(UseResizeObserver, "useResizeObserver").mockReturnValue({
      elementRef: { current: null },
      values: [250],
    })
  })

  it("renders without crashing", () => {
    const props = getProps()
    render(<ImageList {...props} />)
    expect(screen.getAllByRole("img")).toHaveLength(2)
  })

  it("renders explicit width for each image", () => {
    const props = getProps({ width: 300 })
    render(<ImageList {...props} />)

    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(2)
    images.forEach(image => {
      expect(image).toHaveStyle("width: 300px")
    })
  })

  it("creates its `src` attribute using buildMediaURL", () => {
    const props = getProps()
    render(<ImageList {...props} />)
    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(2)

    expect(buildMediaURL).toHaveBeenNthCalledWith(1, "/media/mockImage1.jpeg")
    expect(buildMediaURL).toHaveBeenNthCalledWith(2, "/media/mockImage2.jpeg")

    images.forEach(image => {
      expect(image).toHaveAttribute("src", "https://mock.media.url")
    })
  })

  it("has a caption", () => {
    const props = getProps()
    render(<ImageList {...props} />)

    const caption = screen.getByTestId("stImageCaption")
    expect(caption).toHaveTextContent("a")
  })

  it("renders explicit width for each caption", () => {
    const props = getProps({ width: 300 })
    render(<ImageList {...props} />)

    const caption = screen.getByTestId("stImageCaption")
    expect(caption).toHaveStyle("width: 300px")
  })

  it("sends an CLIENT_ERROR message when the image source fails to load", () => {
    const props = getProps()
    render(<ImageList {...props} />)
    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(2)

    // Trigger the error event on the first image using fireEvent
    fireEvent.error(images[0])

    // Verify the error was sent with correct parameters
    expect(sendClientErrorToHost).toHaveBeenCalledWith(
      "Image",
      "Image source failed to load",
      "onerror triggered",
      "https://mock.media.url/"
    )
  })

  it("slides between images when arrows are clicked", async () => {
    const props = getProps()
    render(<ImageList {...props} />)

    const images = screen.getAllByRole("img")
    expect(images[0]).toBeVisible()
    expect(images[1]).not.toBeVisible()

    const rightArrow = screen.queryByTestId("carousel-next-button")
    const leftArrow = screen.queryByTestId("carousel-prev-button")
    const caption = screen.getByTestId("stImageCaption")
    expect(rightArrow).toBeInTheDocument()
    expect(leftArrow).not.toBeInTheDocument()
    expect(caption).toHaveTextContent("a")

    // Click the right arrow
    await userEvent.click(screen.getByTestId("carousel-next-button"))

    await waitFor(() => {
      expect(images[0]).not.toBeVisible()
    })

    await waitFor(() => {
      expect(images[1]).toBeVisible()
    })

    // It is the last image, so the right arrow should not be visible
    const rightArrowUpdate = screen.queryByTestId("carousel-next-button")
    const leftArrowUpdate = screen.queryByTestId("carousel-prev-button")
    const captionUpdate = screen.getByTestId("stImageCaption")
    expect(rightArrowUpdate).not.toBeInTheDocument()
    expect(leftArrowUpdate).toBeInTheDocument()
    expect(captionUpdate).toHaveTextContent("b")

    await userEvent.click(screen.getByTestId("carousel-prev-button"))

    await waitFor(() => {
      expect(images[0]).toBeVisible()
    })

    await waitFor(() => {
      expect(images[1]).not.toBeVisible()
    })
  })

  it("does not render arrows or dots when there is only one image", () => {
    const props = getProps({
      imgs: [{ caption: "a", url: "/media/mockImage1.jpeg" }],
    })
    render(<ImageList {...props} />)

    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(1)

    const rightArrow = screen.queryByTestId("carousel-next-button")
    const leftArrow = screen.queryByTestId("carousel-prev-button")
    const dots = screen.queryAllByTestId(/carousel-dot-/)

    expect(rightArrow).not.toBeInTheDocument()
    expect(leftArrow).not.toBeInTheDocument()
    expect(dots).toHaveLength(0)
  })

  it("slides between images when dot is clicked", async () => {
    const props = getProps()
    render(<ImageList {...props} />)

    const images = screen.getAllByRole("img")
    const caption = screen.getByTestId("stImageCaption")
    expect(images[0]).toBeVisible()
    expect(images[1]).not.toBeVisible()
    expect(caption).toHaveTextContent("a")

    const dot0 = screen.getByTestId("carousel-dot-0")
    expect(dot0).toBeInTheDocument()
    const dot1 = screen.getByTestId("carousel-dot-1")
    expect(dot1).toBeInTheDocument()

    // The second dot should be active
    expect(dot0).toHaveStyle({ backgroundColor: "rgb(255, 255, 255)" })

    // Click the second dot
    await userEvent.click(dot1)

    await waitFor(() => {
      expect(images[0]).not.toBeVisible()
    })

    await waitFor(() => {
      expect(images[1]).toBeVisible()
    })

    // The second dot should be active
    await waitFor(() => {
      expect(dot1).toHaveStyle({ backgroundColor: "rgb(255, 255, 255)" })
    })

    await waitFor(() => {
      expect(dot1).toHaveStyle("border: 2px solid white")
    })

    const captionUpdate = screen.getByTestId("stImageCaption")
    expect(captionUpdate).toHaveTextContent("b")
  })
})
