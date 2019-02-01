import gql from 'graphql-tag';

import ApolloClient from '../..';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloLink, Observable } from 'apollo-link';

describe('@client @export tests', () => {
  it(
    'should not break @client only queries when the @export directive is ' +
      'used',
    done => {
      const query = gql`
        {
          field @client @export(as: "someVar")
        }
      `;

      const cache = new InMemoryCache();
      const client = new ApolloClient({
        cache,
        link: ApolloLink.empty(),
      });
      cache.writeData({ data: { field: 1 } });

      return client.query({ query }).then(({ data }: any) => {
        expect({ ...data }).toMatchObject({ field: 1 });
        done();
      });
    },
  );

  it(
    'should not break @client only queries when the @export directive is ' +
      'used on nested fields',
    done => {
      const query = gql`
        {
          car @client {
            engine {
              torque @export(as: "torque")
            }
          }
        }
      `;

      const cache = new InMemoryCache();
      const client = new ApolloClient({
        cache,
        link: ApolloLink.empty(),
      });

      cache.writeData({
        data: {
          car: {
            engine: {
              cylinders: 8,
              torque: 7200,
              __typename: 'Engine',
            },
            __typename: 'Car',
          },
        },
      });

      return client.query({ query }).then(({ data }: any) => {
        expect({ ...data }).toMatchObject({
          car: {
            engine: {
              torque: 7200,
            },
          },
        });
        done();
      });
    },
  );

  it(
    'should store the @client field value in the specified @export ' +
      'variable, and make it avilable to a subsequent resolver',
    done => {
      const query = gql`
        query currentAuthorPostCount($authorId: Int!) {
          currentAuthorId @client @export(as: "authorId")
          postCount(authorId: $authorId) @client
        }
      `;

      const testAuthorId = 100;
      const testPostCount = 200;

      const cache = new InMemoryCache();
      const client = new ApolloClient({
        cache,
        resolvers: {
          Query: {
            postCount(_, { authorId }) {
              return authorId === testAuthorId ? testPostCount : 0;
            },
          },
        },
      });

      cache.writeData({
        data: {
          currentAuthorId: testAuthorId,
        },
      });

      return client.query({ query }).then(({ data }: any) => {
        expect({ ...data }).toMatchObject({
          currentAuthorId: testAuthorId,
          postCount: testPostCount,
        });
        done();
      });
    },
  );

  it(
    'should store the @client nested field value in the specified @export ' +
      'variable, and make it avilable to a subsequent resolver',
    done => {
      const query = gql`
        query currentAuthorPostCount($authorId: Int!) {
          currentAuthor @client {
            name
            authorId @export(as: "authorId")
          }
          postCount(authorId: $authorId) @client
        }
      `;

      const testAuthor = {
        name: 'John Smith',
        authorId: 100,
        __typename: 'Author',
      };

      const testPostCount = 200;

      const cache = new InMemoryCache();
      const client = new ApolloClient({
        cache,
        resolvers: {
          Query: {
            postCount(_, { authorId }) {
              return authorId === testAuthor.authorId ? testPostCount : 0;
            },
          },
        },
      });

      cache.writeData({
        data: {
          currentAuthor: testAuthor,
        }
      });

      return client.query({ query }).then(({ data }: any) => {
        expect({ ...data }).toMatchObject({
          currentAuthor: testAuthor,
          postCount: testPostCount,
        });
        done();
      });
    },
  );

  it('should allow @client @export variables to be used with remote queries', done => {
    const query = gql`
      query currentAuthorPostCount($authorId: Int!) {
        currentAuthor @client {
          name
          authorId @export(as: "authorId")
        }
        postCount(authorId: $authorId)
      }
    `;

    const testAuthor = {
      name: 'John Smith',
      authorId: 100,
      __typename: 'Author',
    };

    const testPostCount = 200;

    const link = new ApolloLink(() =>
      Observable.of({
        data: {
          postCount: testPostCount,
        },
      }),
    );

    const cache = new InMemoryCache();
    const client = new ApolloClient({
      cache,
      link,
    });

    cache.writeData({
      data: {
        currentAuthor: testAuthor,
      },
    });

    return client.query({ query }).then(({ data }: any) => {
      expect({ ...data }).toMatchObject({
        currentAuthor: testAuthor,
        postCount: testPostCount,
      });
      done();
    });
  });

  it(
    'should support @client @export variables that are nested multiple ' +
      'levels deep',
    done => {
      const query = gql`
        query currentAuthorPostCount($authorId: Int!) {
          appContainer @client {
            systemDetails {
              currentAuthor {
                name
                authorId @export(as: "authorId")
              }
            }
          }
          postCount(authorId: $authorId)
        }
      `;

      const appContainer = {
        systemDetails: {
          currentAuthor: {
            name: 'John Smith',
            authorId: 100,
            __typename: 'Author',
          },
          __typename: 'SystemDetails',
        },
        __typename: 'AppContainer',
      };

      const testPostCount = 200;

      const link = new ApolloLink(() =>
        Observable.of({
          data: {
            postCount: testPostCount,
          },
        }),
      );

      const cache = new InMemoryCache();
      const client = new ApolloClient({
        cache,
        link,
      });

      cache.writeData({
        data: {
          appContainer,
        },
      });

      return client.query({ query }).then(({ data }: any) => {
        expect({ ...data }).toMatchObject({
          appContainer,
          postCount: testPostCount,
        });
        done();
      });
    },
  );

  it('should ignore @export directives if not used with @client', done => {
    const query = gql`
      query currentAuthorPostCount($authorId: Int!) {
        currentAuthor {
          name
          authorId @export(as: "authorId")
        }
        postCount(authorId: $authorId)
      }
    `;

    const testAuthor = {
      name: 'John Smith',
      authorId: 100,
      __typename: 'Author',
    };
    const testPostCount = 200;

    const link = new ApolloLink(() =>
      Observable.of({
        data: {
          currentAuthor: testAuthor,
          postCount: testPostCount,
        },
      }),
    );

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link,
    });

    return client.query({ query }).then(({ data }: any) => {
      expect({ ...data }).toMatchObject({
        currentAuthor: testAuthor,
        postCount: testPostCount,
      });
      done();
    });
  });

  it(
    'should support setting an @client @export variable, loaded from the ' +
      'cache, on a virtual field that is combined into a remote query.',
    done => {
      const query = gql`
        query postRequiringReview($reviewerId: Int!) {
          postRequiringReview {
            id
            title
            loggedInReviewerId @client @export(as: "reviewerId")
          }
          reviewerDetails(reviewerId: $reviewerId) {
            name
          }
        }
      `;

      const postRequiringReview = {
        id: 10,
        title: 'The Local State Conundrum',
        __typename: 'Post',
      };
      const reviewerDetails = {
        name: 'John Smith',
        __typename: 'Reviewer',
      };
      const loggedInReviewerId = 100;

      const link = new ApolloLink(({ variables }) => {
        expect(variables).toMatchObject({ reviewerId: loggedInReviewerId });
        return Observable.of({
          data: {
            postRequiringReview,
            reviewerDetails,
          },
        });
      });

      const cache = new InMemoryCache();
      const client = new ApolloClient({
        cache,
        link,
      });

      cache.writeData({
        data: {
          postRequiringReview: {
            loggedInReviewerId,
            __typename: 'Post',
          },
        },
      });

      return client.query({ query }).then(({ data }: any) => {
        expect({ ...data }).toMatchObject({
          postRequiringReview: {
            id: postRequiringReview.id,
            title: postRequiringReview.title,
            loggedInReviewerId,
          },
          reviewerDetails,
        });
        done();
      });
    },
  );

  it(
    'should support setting a @client @export variable, loaded via a ' +
      'local resolver, on a virtual field that is combined into a remote query.',
    done => {
      const query = gql`
        query postRequiringReview($reviewerId: Int!) {
          postRequiringReview {
            id
            title
            currentReviewer @client {
              id @export(as: "reviewerId")
            }
          }
          reviewerDetails(reviewerId: $reviewerId) {
            name
          }
        }
      `;

      const postRequiringReview = {
        id: 10,
        title: 'The Local State Conundrum',
        __typename: 'Post',
      };
      const reviewerDetails = {
        name: 'John Smith',
        __typename: 'Reviewer',
      };
      const currentReviewer = {
        id: 100,
        __typename: 'CurrentReviewer',
      };

      const link = new ApolloLink(({ variables }) => {
        expect(variables).toMatchObject({ reviewerId: currentReviewer.id });
        return Observable.of({
          data: {
            postRequiringReview,
            reviewerDetails,
          },
        });
      });

      const cache = new InMemoryCache();
      const client = new ApolloClient({
        cache,
        link,
        resolvers: {
          CurrentReviewer: {
            id: () => currentReviewer.id,
          },
        },
      });

      cache.writeData({
        data: {
          postRequiringReview: {
            currentReviewer: {
              __typename: 'CurrentReviewer',
            },
            __typename: 'Post',
          },
        },
      });

      return client.query({ query }).then(({ data }: any) => {
        expect({ ...data }).toMatchObject({
          postRequiringReview: {
            id: postRequiringReview.id,
            title: postRequiringReview.title,
            currentReviewer,
          },
          reviewerDetails,
        });
        done();
      });
    },
  );

  it(
    'should support combining @client @export variables, calculated by a ' +
      'local resolver, with remote mutations',
    done => {
      const mutation = gql`
        mutation upvotePost($postId: Int!) {
          topPost @client @export(as: "postId")
          upvotePost(postId: $postId) {
            title
            votes
          }
        }
      `;

      const testPostId = 100;
      const testPost = {
        title: 'The Day of the Jackal',
        votes: 10,
        __typename: 'post',
      };

      const link = new ApolloLink(({ variables }) => {
        expect(variables).toMatchObject({ postId: testPostId });
        return Observable.of({
          data: {
            upvotePost: testPost,
          },
        });
      });

      const client = new ApolloClient({
        cache: new InMemoryCache(),
        link,
        resolvers: {
          Mutation: {
            topPost() {
              return testPostId;
            },
          },
        },
      });

      return client.mutate({ mutation }).then(({ data }: any) => {
        expect({ ...data }).toMatchObject({
          upvotePost: testPost,
        });
        done();
      });
    },
  );

  it(
    'should support combining @client @export variables, calculated by ' +
      'reading from the cache, with remote mutations',
    done => {
      const mutation = gql`
        mutation upvotePost($postId: Int!) {
          topPost @client @export(as: "postId")
          upvotePost(postId: $postId) {
            title
            votes
          }
        }
      `;

      const testPostId = 100;
      const testPost = {
        title: 'The Day of the Jackal',
        votes: 10,
        __typename: 'post',
      };

      const link = new ApolloLink(({ variables }) => {
        expect(variables).toMatchObject({ postId: testPostId });
        return Observable.of({
          data: {
            upvotePost: testPost,
          },
        });
      });

      const cache = new InMemoryCache();
      const client = new ApolloClient({
        cache,
        link,
      });

      cache.writeData({
        data: {
          topPost: testPostId,
        },
      });

      return client.mutate({ mutation }).then(({ data }: any) => {
        expect({ ...data }).toMatchObject({
          upvotePost: testPost,
        });
        done();
      });
    },
  );

  it(
    'should use the value of the last @export variable defined, if multiple ' +
      'variables are defined with the same name',
    done => {
      const query = gql`
        query reviewerPost($reviewerId: Int!) {
          primaryReviewerId @client @export(as: "reviewerId")
          secondaryReviewerId @client @export(as: "reviewerId")
          post(reviewerId: $reviewerId) {
            title
          }
        }
      `;

      const post = {
        title: 'The One Post to Rule Them All',
        __typename: 'Post',
      };
      const primaryReviewerId = 100;
      const secondaryReviewerId = 200;

      const link = new ApolloLink(({ variables }) => {
        expect(variables).toMatchObject({ reviewerId: secondaryReviewerId });
        return Observable.of({
          data: {
            post,
          },
        });
      });

      const cache = new InMemoryCache();
      const client = new ApolloClient({
        cache,
        link,
      });

      cache.writeData({
        data: {
          primaryReviewerId,
          secondaryReviewerId,
        },
      });

      return client.query({ query }).then(({ data }: any) => {
        expect({ ...data }).toMatchObject({
          post,
        });
        done();
      });
    },
  );
});
